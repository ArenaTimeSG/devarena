-- Migration: Add working_hours column to settings table
-- Date: 2025-01-21
-- Description: Adds working_hours JSON column to store operating hours per day

-- Add working_hours column to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{
  "monday": {"start": "08:00", "end": "22:00", "enabled": true},
  "tuesday": {"start": "08:00", "end": "22:00", "enabled": true},
  "wednesday": {"start": "08:00", "end": "22:00", "enabled": true},
  "thursday": {"start": "08:00", "end": "22:00", "enabled": true},
  "friday": {"start": "08:00", "end": "22:00", "enabled": true},
  "saturday": {"start": "08:00", "end": "18:00", "enabled": true},
  "sunday": {"start": "08:00", "end": "18:00", "enabled": false}
}'::jsonb;

-- Update existing records to have default working hours if they don't have any
UPDATE public.settings 
SET working_hours = '{
  "monday": {"start": "08:00", "end": "22:00", "enabled": true},
  "tuesday": {"start": "08:00", "end": "22:00", "enabled": true},
  "wednesday": {"start": "08:00", "end": "22:00", "enabled": true},
  "thursday": {"start": "08:00", "end": "22:00", "enabled": true},
  "friday": {"start": "08:00", "end": "22:00", "enabled": true},
  "saturday": {"start": "08:00", "end": "18:00", "enabled": true},
  "sunday": {"start": "08:00", "end": "18:00", "enabled": false}
}'::jsonb
WHERE working_hours IS NULL;

-- Make working_hours column NOT NULL after setting default values
ALTER TABLE public.settings 
ALTER COLUMN working_hours SET NOT NULL;

-- Add comment to the column
COMMENT ON COLUMN public.settings.working_hours IS 'JSON object containing working hours for each day of the week';

-- Verify the migration
DO $$
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'settings' 
    AND column_name = 'working_hours'
  ) THEN
    RAISE EXCEPTION 'Column working_hours was not added successfully';
  END IF;
  
  -- Check if default values were set
  IF EXISTS (
    SELECT 1 FROM public.settings 
    WHERE working_hours IS NULL
  ) THEN
    RAISE EXCEPTION 'Some records still have NULL working_hours';
  END IF;
  
  RAISE NOTICE 'Migration completed successfully: working_hours column added to settings table';
END $$;



