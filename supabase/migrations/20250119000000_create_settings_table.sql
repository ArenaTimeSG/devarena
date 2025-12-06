-- Create settings table for system configuration
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
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for settings (users can only access their own settings)
CREATE POLICY "Users can manage their own settings" 
ON public.settings FOR ALL TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_settings_user_id ON public.settings(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to initialize default settings for new users
CREATE OR REPLACE FUNCTION create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.settings (user_id, user_profile)
    VALUES (
        NEW.id,
        jsonb_build_object(
            'name', COALESCE(NEW.raw_user_meta_data->>'name', ''),
            'email', NEW.email,
            'phone', COALESCE(NEW.raw_user_meta_data->>'phone', '')
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to create default settings when user signs up
CREATE TRIGGER create_user_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_settings();


