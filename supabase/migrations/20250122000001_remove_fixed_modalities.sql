-- Migration: Remove fixed modalities from settings
-- Date: 2025-01-22
-- Description: Removes the fixed modalities (volei, futsal, basquete) from existing settings

-- Update existing settings to remove fixed modalities
UPDATE public.settings 
SET 
  modalities_enabled = '{}'::jsonb,
  modalities_colors = '{}'::jsonb
WHERE 
  modalities_enabled IS NOT NULL 
  OR modalities_colors IS NOT NULL;

-- Verify the migration
DO $$
BEGIN
  -- Check if any settings still have fixed modalities
  IF EXISTS (
    SELECT 1 FROM public.settings 
    WHERE 
      modalities_enabled::text LIKE '%volei%' 
      OR modalities_enabled::text LIKE '%futsal%' 
      OR modalities_enabled::text LIKE '%basquete%'
      OR modalities_colors::text LIKE '%volei%' 
      OR modalities_colors::text LIKE '%futsal%' 
      OR modalities_colors::text LIKE '%basquete%'
  ) THEN
    RAISE EXCEPTION 'Some settings still contain fixed modalities';
  END IF;
  
  RAISE NOTICE 'Migration completed successfully: fixed modalities removed from settings';
END $$;

