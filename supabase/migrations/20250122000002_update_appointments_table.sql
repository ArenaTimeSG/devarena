-- Migration: Update appointments table to include modality_id and valor_total
-- Date: 2025-01-22
-- Description: Adds modality_id foreign key and valor_total field to appointments table

-- Add modality_id column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS modality_id UUID REFERENCES public.modalities(id) ON DELETE SET NULL;

-- Add valor_total column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS valor_total DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Create index for better performance on modality_id
CREATE INDEX IF NOT EXISTS idx_appointments_modality_id ON public.appointments(modality_id);

-- Add comment to the columns
COMMENT ON COLUMN public.appointments.modality_id IS 'Foreign key reference to modalities table';
COMMENT ON COLUMN public.appointments.valor_total IS 'Total value of the appointment (inherited from modality value)';

-- Verify the migration
DO $$
BEGIN
  -- Check if columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'modality_id'
  ) THEN
    RAISE EXCEPTION 'Column modality_id was not added successfully';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'valor_total'
  ) THEN
    RAISE EXCEPTION 'Column valor_total was not added successfully';
  END IF;
  
  RAISE NOTICE 'Migration completed successfully: appointments table updated with modality_id and valor_total';
END $$;

