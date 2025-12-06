-- =====================================================
-- Migration: Create time_blockades table
-- Date: 2025-01-25
-- Description: Creates table for blocking individual time slots with custom nomenclature
-- =====================================================

-- Create time_blockades table
CREATE TABLE IF NOT EXISTS public.time_blockades (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot TIME NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Ensure unique combination of user, date and time_slot
    UNIQUE(user_id, date, time_slot)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_time_blockades_user_id ON public.time_blockades(user_id);
CREATE INDEX IF NOT EXISTS idx_time_blockades_date ON public.time_blockades(date);
CREATE INDEX IF NOT EXISTS idx_time_blockades_user_date ON public.time_blockades(user_id, date);
CREATE INDEX IF NOT EXISTS idx_time_blockades_created_at ON public.time_blockades(created_at);

-- Enable Row Level Security
ALTER TABLE public.time_blockades ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (users can only manage their own blockades)
CREATE POLICY "Users can manage their own time blockades" 
ON public.time_blockades FOR ALL TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_time_blockades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_time_blockades_updated_at
    BEFORE UPDATE ON public.time_blockades
    FOR EACH ROW
    EXECUTE FUNCTION update_time_blockades_updated_at();

-- Add comments
COMMENT ON TABLE public.time_blockades IS 'Table for blocking individual time slots with custom reasons';
COMMENT ON COLUMN public.time_blockades.user_id IS 'Admin user who created the blockade';
COMMENT ON COLUMN public.time_blockades.date IS 'Date of the blocked time slot';
COMMENT ON COLUMN public.time_blockades.time_slot IS 'Time slot that is blocked (format: HH:MM)';
COMMENT ON COLUMN public.time_blockades.reason IS 'Short reason for the blockade (e.g., "Manutenção", "Feriado", "Evento")';
COMMENT ON COLUMN public.time_blockades.description IS 'Optional detailed description of the blockade';

-- Verify the migration
DO $$
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'time_blockades'
  ) THEN
    RAISE EXCEPTION 'Table time_blockades was not created successfully';
  END IF;
  
  -- Check if indexes exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'time_blockades' 
    AND indexname = 'idx_time_blockades_user_id'
  ) THEN
    RAISE EXCEPTION 'Index idx_time_blockades_user_id was not created successfully';
  END IF;
  
  RAISE NOTICE 'Migration completed successfully: time_blockades table created with all indexes and policies';
END $$;
l