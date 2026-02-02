-- =====================================================
-- MIGRAÇÃO COMBINADA: Sistema de Múltiplas Quadras
-- Execute este arquivo completo no Supabase SQL Editor
-- Data: 2025-02-01
-- =====================================================

-- =====================================================
-- PARTE 1: Criar tabela courts
-- =====================================================

-- Create courts table
CREATE TABLE IF NOT EXISTS public.courts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraint: unique court name per user
    CONSTRAINT unique_court_name_per_user UNIQUE (user_id, name)
);

-- Create index for better performance on user_id
CREATE INDEX IF NOT EXISTS idx_courts_user_id ON public.courts(user_id);

-- Create index for active courts
CREATE INDEX IF NOT EXISTS idx_courts_is_active ON public.courts(is_active);

-- Add comments
COMMENT ON TABLE public.courts IS 'Quadras esportivas disponíveis para agendamento';
COMMENT ON COLUMN public.courts.user_id IS 'Proprietário/admin da quadra';
COMMENT ON COLUMN public.courts.name IS 'Nome da quadra (ex: Quadra 1, Quadra 2)';
COMMENT ON COLUMN public.courts.is_active IS 'Se a quadra está ativa e disponível para agendamento';

-- Enable Row Level Security
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own courts
DROP POLICY IF EXISTS "Users can view their own courts" ON public.courts;
CREATE POLICY "Users can view their own courts"
    ON public.courts
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own courts
DROP POLICY IF EXISTS "Users can insert their own courts" ON public.courts;
CREATE POLICY "Users can insert their own courts"
    ON public.courts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own courts
DROP POLICY IF EXISTS "Users can update their own courts" ON public.courts;
CREATE POLICY "Users can update their own courts"
    ON public.courts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own courts
DROP POLICY IF EXISTS "Users can delete their own courts" ON public.courts;
CREATE POLICY "Users can delete their own courts"
    ON public.courts
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_courts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_courts_updated_at ON public.courts;
CREATE TRIGGER update_courts_updated_at
    BEFORE UPDATE ON public.courts
    FOR EACH ROW
    EXECUTE FUNCTION update_courts_updated_at();

-- =====================================================
-- PARTE 2: Adicionar court_id em appointments
-- =====================================================

-- Add court_id column to appointments table (nullable for backward compatibility)
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL;

-- Create index for better performance on court_id
CREATE INDEX IF NOT EXISTS idx_appointments_court_id ON public.appointments(court_id);

-- Create composite index for queries filtering by user_id and court_id
CREATE INDEX IF NOT EXISTS idx_appointments_user_court ON public.appointments(user_id, court_id);

-- Add comment to the column
COMMENT ON COLUMN public.appointments.court_id IS 'Foreign key reference to courts table - identifies which court the appointment is for';

-- Function to create default court "Quadra 1" for existing users
CREATE OR REPLACE FUNCTION create_default_court_for_user(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_court_id UUID;
BEGIN
    -- Check if user already has a court named "Quadra 1"
    SELECT id INTO v_court_id
    FROM public.courts
    WHERE user_id = p_user_id AND name = 'Quadra 1'
    LIMIT 1;
    
    -- If not found, create it
    IF v_court_id IS NULL THEN
        INSERT INTO public.courts (user_id, name, description, is_active)
        VALUES (p_user_id, 'Quadra 1', 'Quadra padrão criada automaticamente', TRUE)
        RETURNING id INTO v_court_id;
    END IF;
    
    RETURN v_court_id;
END;
$$ LANGUAGE plpgsql;

-- Create default court "Quadra 1" for all existing users with appointments
DO $$
DECLARE
    v_user_id UUID;
    v_court_id UUID;
BEGIN
    -- Loop through all unique user_ids in appointments
    FOR v_user_id IN 
        SELECT DISTINCT user_id 
        FROM public.appointments 
        WHERE user_id IS NOT NULL
    LOOP
        -- Create default court for this user
        v_court_id := create_default_court_for_user(v_user_id);
        
        -- Update all appointments for this user to use the default court
        UPDATE public.appointments
        SET court_id = v_court_id
        WHERE user_id = v_user_id AND court_id IS NULL;
        
        RAISE NOTICE 'Created default court for user % and updated appointments', v_user_id;
    END LOOP;
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

DO $$
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'courts'
  ) THEN
    RAISE EXCEPTION 'Table courts was not created successfully';
  END IF;
  
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'court_id'
  ) THEN
    RAISE EXCEPTION 'Column court_id was not added successfully';
  END IF;
  
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '   - Table courts created';
  RAISE NOTICE '   - Column court_id added to appointments';
  RAISE NOTICE '   - Default courts created for existing users';
END $$;
