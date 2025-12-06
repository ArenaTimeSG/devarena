-- Migration: Create modalities table
-- Date: 2025-01-22
-- Description: Creates a new modalities table to replace the fixed modalities system

-- Create modalities table
CREATE TABLE public.modalities (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Ensure unique modality names per user
    UNIQUE(user_id, name)
);

-- Enable Row Level Security
ALTER TABLE public.modalities ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for modalities (users can only access their own modalities)
CREATE POLICY "Users can manage their own modalities" ON public.modalities
    FOR ALL USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_modalities_user_id ON public.modalities(user_id);

-- Add comment to the table
COMMENT ON TABLE public.modalities IS 'Table to store user-defined sports modalities';

-- Verify the migration
DO $$
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'modalities'
  ) THEN
    RAISE EXCEPTION 'Table modalities was not created successfully';
  END IF;
  
  RAISE NOTICE 'Migration completed successfully: modalities table created';
END $$;

