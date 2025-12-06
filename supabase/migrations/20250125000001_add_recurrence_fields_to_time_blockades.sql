-- =====================================================
-- Migration: Add recurrence fields to time_blockades table
-- Date: 2025-01-25
-- Description: Adds fields to track recurring blockades properly
-- =====================================================

-- Add recurrence fields to time_blockades table
ALTER TABLE public.time_blockades 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurrence_type VARCHAR(20) CHECK (recurrence_type IN ('daily', 'weekly', 'monthly')),
ADD COLUMN IF NOT EXISTS original_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS is_indefinite BOOLEAN DEFAULT FALSE;

-- Create index for better performance on recurrence queries
CREATE INDEX IF NOT EXISTS idx_time_blockades_recurrence ON public.time_blockades(is_recurring, original_date, recurrence_type);

-- Add comments for new columns
COMMENT ON COLUMN public.time_blockades.is_recurring IS 'Indicates if this blockade is part of a recurring series';
COMMENT ON COLUMN public.time_blockades.recurrence_type IS 'Type of recurrence: daily, weekly, or monthly';
COMMENT ON COLUMN public.time_blockades.original_date IS 'Original date when the recurring blockade was first created';
COMMENT ON COLUMN public.time_blockades.end_date IS 'End date for the recurring blockade series (null if indefinite)';
COMMENT ON COLUMN public.time_blockades.is_indefinite IS 'Indicates if the recurring blockade has no end date';

-- Verify the migration
DO $$
BEGIN
  -- Check if new columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_blockades' 
    AND column_name = 'is_recurring'
  ) THEN
    RAISE EXCEPTION 'Column is_recurring was not added successfully';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_blockades' 
    AND column_name = 'recurrence_type'
  ) THEN
    RAISE EXCEPTION 'Column recurrence_type was not added successfully';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_blockades' 
    AND column_name = 'original_date'
  ) THEN
    RAISE EXCEPTION 'Column original_date was not added successfully';
  END IF;
  
  RAISE NOTICE 'Migration completed successfully: recurrence fields added to time_blockades table';
END $$;
