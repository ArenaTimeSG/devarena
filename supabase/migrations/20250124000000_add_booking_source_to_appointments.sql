-- =====================================================
-- Migration: Add booking_source column to appointments table
-- Date: 2025-01-24
-- Description: Adds booking_source field to distinguish between manual and online bookings
-- =====================================================

-- Add booking_source column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS booking_source VARCHAR(20) NOT NULL DEFAULT 'manual' 
CHECK (booking_source IN ('manual', 'online'));

-- Create index for better performance on booking_source
CREATE INDEX IF NOT EXISTS idx_appointments_booking_source ON public.appointments(booking_source);

-- Add comment to the column
COMMENT ON COLUMN public.appointments.booking_source IS 'Source of the booking: manual (admin) or online (client)';

-- Update existing appointments to have 'manual' as default
UPDATE public.appointments 
SET booking_source = 'manual' 
WHERE booking_source IS NULL;

-- Verify the migration
DO $$
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'booking_source'
  ) THEN
    RAISE EXCEPTION 'Column booking_source was not added successfully';
  END IF;
  
  RAISE NOTICE 'Migration completed successfully: appointments table updated with booking_source column';
END $$;
