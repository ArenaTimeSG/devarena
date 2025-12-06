-- Migration: Add is_cortesia column to appointments table
-- Date: 2025-01-26
-- Description: Adds is_cortesia boolean field to appointments table for free appointments

-- Add is_cortesia column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS is_cortesia BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for better performance on is_cortesia
CREATE INDEX IF NOT EXISTS idx_appointments_is_cortesia ON public.appointments(is_cortesia);

-- Add comment to the column
COMMENT ON COLUMN public.appointments.is_cortesia IS 'Indicates if the appointment is free (cortesia)';

-- Verify the migration
DO $$
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'is_cortesia'
  ) THEN
    RAISE EXCEPTION 'Column is_cortesia was not added successfully';
  END IF;
  
  RAISE NOTICE 'Migration completed successfully: appointments table updated with is_cortesia column';
END $$;

