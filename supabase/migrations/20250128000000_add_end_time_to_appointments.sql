-- Migration: Add end_time field to appointments table
-- Date: 2025-01-28
-- Description: Adds end_time field to support flexible appointment durations (not just 1-hour slots)

-- Add end_time column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;

-- For existing appointments, set end_time to 1 hour after date (backward compatibility)
UPDATE public.appointments 
SET end_time = date + INTERVAL '1 hour'
WHERE end_time IS NULL;

-- Make end_time NOT NULL after populating existing records
ALTER TABLE public.appointments 
ALTER COLUMN end_time SET NOT NULL;

-- Add constraint to ensure end_time > date (start time)
ALTER TABLE public.appointments 
ADD CONSTRAINT check_end_after_start 
CHECK (end_time > date);

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
  
  RAISE NOTICE 'Migration completed successfully: appointments table updated with end_time';
END $$;

