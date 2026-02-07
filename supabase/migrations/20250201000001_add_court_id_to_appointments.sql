-- =====================================================
-- Migration: Add court_id column to appointments table
-- Date: 2025-02-01
-- Description: Adds court_id field to link appointments to courts
-- =====================================================

-- Add court_id column to appointments table (nullable for backward compatibility)
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL;

-- Create index for better performance on court_id
CREATE INDEX IF NOT EXISTS idx_appointments_court_id ON public.appointments(court_id);

-- Create composite index for queries filtering by user_id and court_id
CREATE INDEX IF NOT EXISTS idx_appointments_user_court ON public.appointments(user_id, court_id);

-- Add comment to the column
COMMENT ON COLUMN public.appointments.court_id IS 'Foreign key reference to courts table - identifies which court the appointment is for';

-- Function to create default court "Quadra 1" for existing users
CREATE OR REPLACE FUNCTION create_default_court_for_user(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_court_id UUID;
BEGIN
    -- Check if user already has a court named "Quadra 1"
    SELECT id INTO v_court_id
    FROM public.courts
    WHERE user_id = p_user_id AND name = 'Quadra 1'
    LIMIT 1;
    
    -- If not found, create it
    IF v_court_id IS NULL THEN
        INSERT INTO public.courts (user_id, name, description, is_active)
        VALUES (p_user_id, 'Quadra 1', NULL, TRUE)
        RETURNING id INTO v_court_id;
    END IF;
    
    RETURN v_court_id;
END;
$$ LANGUAGE plpgsql;

-- Create default court "Quadra 1" for all existing users with appointments
DO $$
DECLARE
    v_user_id UUID;
    v_court_id UUID;
BEGIN
    -- Loop through all unique user_ids in appointments
    FOR v_user_id IN 
        SELECT DISTINCT user_id 
        FROM public.appointments 
        WHERE user_id IS NOT NULL
    LOOP
        -- Create default court for this user
        v_court_id := create_default_court_for_user(v_user_id);
        
        -- Update all appointments for this user to use the default court
        UPDATE public.appointments
        SET court_id = v_court_id
        WHERE user_id = v_user_id AND court_id IS NULL;
        
        RAISE NOTICE 'Created default court for user % and updated appointments', v_user_id;
    END LOOP;
END $$;

-- After populating court_id for existing appointments, we can optionally make it NOT NULL
-- But we'll keep it nullable for flexibility (users might want to have appointments without a specific court)
-- Uncomment the following lines if you want to enforce court_id as required:
-- ALTER TABLE public.appointments 
-- ALTER COLUMN court_id SET NOT NULL;

-- Verify the migration
DO $$
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'court_id'
  ) THEN
    RAISE EXCEPTION 'Column court_id was not added successfully';
  END IF;
  
  RAISE NOTICE 'Migration completed successfully: appointments table updated with court_id column';
END $$;
