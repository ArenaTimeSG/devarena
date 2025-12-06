-- Verify and fix settings table issues
-- This migration checks for common issues and fixes them

-- Check if table exists and create if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings') THEN
        RAISE NOTICE 'Settings table does not exist. Creating it...';
        
        -- Create settings table
        CREATE TABLE public.settings (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            modalities JSONB NOT NULL DEFAULT '{
                "volei": {"active": true, "color": "#3b82f6"},
                "futsal": {"active": true, "color": "#10b981"},
                "basquete": {"active": true, "color": "#f59e0b"}
            }'::jsonb,
            schedule JSONB NOT NULL DEFAULT '{
                "monday": {"start": "08:00", "end": "22:00", "interval": 60, "disabled": []},
                "tuesday": {"start": "08:00", "end": "22:00", "interval": 60, "disabled": []},
                "wednesday": {"start": "08:00", "end": "22:00", "interval": 60, "disabled": []},
                "thursday": {"start": "08:00", "end": "22:00", "interval": 60, "disabled": []},
                "friday": {"start": "08:00", "end": "22:00", "interval": 60, "disabled": []},
                "saturday": {"start": "08:00", "end": "18:00", "interval": 60, "disabled": []},
                "sunday": {"start": "08:00", "end": "18:00", "interval": 60, "disabled": []}
            }'::jsonb,
            notifications JSONB NOT NULL DEFAULT '{
                "email": true,
                "push": false,
                "alerts": {
                    "booking": true,
                    "cancellation": true,
                    "payment": true
                }
            }'::jsonb,
            user_profile JSONB NOT NULL DEFAULT '{
                "name": "",
                "email": "",
                "phone": ""
            }'::jsonb,
            theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'custom')),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            UNIQUE(user_id)
        );
        
        -- Enable RLS
        ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policy
        CREATE POLICY "Users can manage their own settings" 
        ON public.settings FOR ALL TO authenticated 
        USING (auth.uid() = user_id) 
        WITH CHECK (auth.uid() = user_id);
        
        -- Create index
        CREATE INDEX idx_settings_user_id ON public.settings(user_id);
        
        RAISE NOTICE 'Settings table created successfully';
    ELSE
        RAISE NOTICE 'Settings table already exists';
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policy to ensure it's correct
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.settings;
CREATE POLICY "Users can manage their own settings" 
ON public.settings FOR ALL TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Ensure index exists
DROP INDEX IF EXISTS idx_settings_user_id;
CREATE INDEX idx_settings_user_id ON public.settings(user_id);

-- Grant permissions
GRANT ALL ON public.settings TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create or replace functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace trigger
DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create or replace default settings function
CREATE OR REPLACE FUNCTION create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.settings WHERE user_id = NEW.id) THEN
        INSERT INTO public.settings (user_id, user_profile)
        VALUES (
            NEW.id,
            jsonb_build_object(
                'name', COALESCE(NEW.raw_user_meta_data->>'name', ''),
                'email', NEW.email,
                'phone', COALESCE(NEW.raw_user_meta_data->>'phone', '')
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace trigger for new users
DROP TRIGGER IF EXISTS create_user_settings ON auth.users;
CREATE TRIGGER create_user_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_settings();

-- Insert default settings for existing users who don't have them
INSERT INTO public.settings (user_id, user_profile)
SELECT 
    u.id,
    jsonb_build_object(
        'name', COALESCE(u.raw_user_meta_data->>'name', ''),
        'email', u.email,
        'phone', COALESCE(u.raw_user_meta_data->>'phone', '')
    )
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.settings s WHERE s.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Final verification
DO $$
DECLARE
    table_exists BOOLEAN;
    rls_enabled BOOLEAN;
    policy_exists BOOLEAN;
    index_exists BOOLEAN;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'settings'
    ) INTO table_exists;
    
    -- Check if RLS is enabled
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'settings' AND rowsecurity = true
    ) INTO rls_enabled;
    
    -- Check if policy exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'settings'
    ) INTO policy_exists;
    
    -- Check if index exists
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' AND tablename = 'settings' AND indexname = 'idx_settings_user_id'
    ) INTO index_exists;
    
    -- Report status
    RAISE NOTICE 'Settings table verification:';
    RAISE NOTICE '  Table exists: %', table_exists;
    RAISE NOTICE '  RLS enabled: %', rls_enabled;
    RAISE NOTICE '  Policy exists: %', policy_exists;
    RAISE NOTICE '  Index exists: %', index_exists;
    
    -- Raise error if critical issues found
    IF NOT table_exists THEN
        RAISE EXCEPTION 'Settings table does not exist after migration';
    END IF;
    
    IF NOT rls_enabled THEN
        RAISE EXCEPTION 'RLS is not enabled on settings table';
    END IF;
    
    IF NOT policy_exists THEN
        RAISE EXCEPTION 'RLS policy does not exist on settings table';
    END IF;
    
    RAISE NOTICE 'Settings table is properly configured and ready to use';
END $$;


