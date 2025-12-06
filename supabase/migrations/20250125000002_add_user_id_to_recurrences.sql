-- =====================================================
-- Migration: Add user_id column to recurrences table
-- Date: 2025-01-25
-- Description: Adds user_id field to link recurrences to users
-- =====================================================

-- Add user_id column to recurrences table
ALTER TABLE public.recurrences 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance on user_id
CREATE INDEX IF NOT EXISTS idx_recurrences_user_id ON public.recurrences(user_id);

-- Add comment to the column
COMMENT ON COLUMN public.recurrences.user_id IS 'Foreign key reference to auth.users table';

-- Update existing recurrences to have a default user_id (if any users exist)
-- This is a safety measure - in practice, you should manually assign user_id to existing recurrences
DO $$
DECLARE
    default_user_id UUID;
BEGIN
    -- Get the first user as default (if any exists)
    SELECT id INTO default_user_id FROM auth.users LIMIT 1;
    
    -- Only update if we have a user and recurrences without user_id
    IF default_user_id IS NOT NULL THEN
        UPDATE public.recurrences 
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
    AND table_name = 'recurrences' 
    AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION 'Column user_id was not added successfully';
  END IF;
  
  RAISE NOTICE 'Migration completed successfully: recurrences table updated with user_id column';
END $$;
