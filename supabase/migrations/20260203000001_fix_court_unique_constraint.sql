-- =====================================================
-- Migration: Fix court unique constraint to allow same name for inactive courts
-- Date: 2026-02-03
-- Description: Modifies the unique constraint to only apply to active courts,
--              allowing users to reuse names for deleted (inactive) courts
-- =====================================================

-- Remove the old unique constraint
ALTER TABLE public.courts 
DROP CONSTRAINT IF EXISTS unique_court_name_per_user;

-- Create a partial unique index that only applies to active courts
-- This allows multiple inactive courts with the same name, but only one active court per name per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_court_name_per_user 
ON public.courts (user_id, name) 
WHERE is_active = true;

-- Add comment explaining the constraint
COMMENT ON INDEX unique_active_court_name_per_user IS 
'Ensures that each user can only have one active court with a given name. Inactive (deleted) courts can have duplicate names.';
