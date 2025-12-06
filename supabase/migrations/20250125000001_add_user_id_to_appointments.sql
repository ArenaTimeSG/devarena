-- =====================================================
-- Migration: Add user_id column to appointments table
-- Date: 2025-01-25
-- Description: Adds user_id field to link appointments to users
-- =====================================================

-- Add user_id column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance on user_id
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);

-- Add comment to the column
COMMENT ON COLUMN public.appointments.user_id IS 'Foreign key reference to auth.users table';

-- Update existing appointments to have a default user_id (if any users exist)
-- This is a safety measure - in practice, you should manually assign user_id to existing appointments
DO $$
DECLARE
    default_user_id UUID;
BEGIN
    -- Get the first user as default (if any exists)
    SELECT id INTO default_user_id FROM auth.users LIMIT 1;
    
    -- Only update if we have a user and appointments without user_id
    IF default_user_id IS NOT NULL THEN
        UPDATE public.appointments 
        SET user_id = default_user_id 
        WHERE user_id IS NULL;
    END IF;
END $$;

-- Verify the migration
DO $$
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION 'Column user_id was not added successfully';
  END IF;
  
  RAISE NOTICE 'Migration completed successfully: appointments table updated with user_id column';
END $$;
