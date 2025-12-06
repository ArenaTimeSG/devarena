-- Migration: Add time_format_interval column to settings table
-- Date: 2025-01-27
-- Description: Adds time_format_interval column to control time slot format (30min or 60min intervals)

-- Add time_format_interval column to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS time_format_interval INTEGER DEFAULT 60;

-- Update existing records to have default 60-minute interval
UPDATE public.settings 
SET time_format_interval = 60
WHERE time_format_interval IS NULL;

-- Make time_format_interval column NOT NULL after setting default values
ALTER TABLE public.settings 
ALTER COLUMN time_format_interval SET NOT NULL;

-- Add comment to the column
COMMENT ON COLUMN public.settings.time_format_interval IS 'Time slot interval in minutes: 30 for half-hour slots (13:30, 14:30), 60 for full-hour slots (13:00, 14:00)';

-- Add check constraint to ensure only valid values
ALTER TABLE public.settings 
ADD CONSTRAINT check_time_format_interval 
CHECK (time_format_interval IN (30, 60));

-- Verify the migration
DO $$
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'settings' 
    AND column_name = 'time_format_interval'
  ) THEN
    RAISE EXCEPTION 'Column time_format_interval was not created successfully';
  END IF;
  
  -- Check if constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'check_time_format_interval'
  ) THEN
    RAISE EXCEPTION 'Check constraint check_time_format_interval was not created successfully';
  END IF;
  
  RAISE NOTICE 'Migration completed successfully: time_format_interval column added to settings table';
END $$;
