-- =====================================================
-- Migration: Create courts table for multiple courts support
-- Date: 2025-02-01
-- Description: Creates courts table to support multiple courts per user
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
CREATE POLICY "Users can view their own courts"
    ON public.courts
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own courts
CREATE POLICY "Users can insert their own courts"
    ON public.courts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own courts
CREATE POLICY "Users can update their own courts"
    ON public.courts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own courts
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
CREATE TRIGGER update_courts_updated_at
    BEFORE UPDATE ON public.courts
    FOR EACH ROW
    EXECUTE FUNCTION update_courts_updated_at();

-- Verify the migration
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
  
  RAISE NOTICE 'Migration completed successfully: courts table created';
END $$;
