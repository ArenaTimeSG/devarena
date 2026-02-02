-- =====================================================
-- Migration: Ensure end_time column exists in appointments table
-- Date: 2025-02-01
-- Description: Adds end_time column if it doesn't exist (safety migration)
-- =====================================================

-- Add end_time column to appointments table if it doesn't exist
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;

-- For existing appointments without end_time, set end_time to 1 hour after date (backward compatibility)
UPDATE public.appointments 
SET end_time = date + INTERVAL '1 hour'
WHERE end_time IS NULL;

-- Only make end_time NOT NULL if there are no NULL values remaining
DO $$
BEGIN
  -- Check if there are any NULL values
  IF NOT EXISTS (
    SELECT 1 FROM public.appointments WHERE end_time IS NULL
  ) THEN
    -- Only then make it NOT NULL
    ALTER TABLE public.appointments 
    ALTER COLUMN end_time SET NOT NULL;
  END IF;
END $$;

-- Add constraint to ensure end_time > date (start time) if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_end_after_start'
  ) THEN
    ALTER TABLE public.appointments 
    ADD CONSTRAINT check_end_after_start 
    CHECK (end_time > date);
  END IF;
END $$;

-- Create index for better performance on end_time queries
CREATE INDEX IF NOT EXISTS idx_appointments_end_time ON public.appointments(end_time);

-- Create composite index for time range queries
CREATE INDEX IF NOT EXISTS idx_appointments_time_range ON public.appointments(date, end_time);

-- Add comments to the columns
COMMENT ON COLUMN public.appointments.date IS 'Start time of the appointment (timestamp)';
COMMENT ON COLUMN public.appointments.end_time IS 'End time of the appointment (timestamp)';

-- Verify the migration
DO $$
BEGIN
  -- Check if end_time column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'end_time'
  ) THEN
    RAISE EXCEPTION 'Column end_time was not added successfully';
  END IF;
  
  RAISE NOTICE '✅ Migration completed successfully: appointments table updated with end_time column';
END $$;
