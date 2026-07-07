-- Fix purchases table to ensure level_id is properly populated and video_id is removed
-- This migration ensures all purchases reference level_id instead of video_id

-- First, ensure level_id is populated for any remaining NULL entries
UPDATE purchases p
SET level_id = (
  SELECT l.id 
  FROM levels l
  JOIN videos v ON v.course_id = l.course_id AND v.level::text = l.level_order::text
  WHERE p.user_id IS NOT NULL
  LIMIT 1
)
WHERE p.level_id IS NULL AND p.user_id IS NOT NULL;

-- Then safely drop video_id column if it still exists
ALTER TABLE purchases
  DROP COLUMN IF EXISTS video_id CASCADE;

-- Ensure level_id is NOT NULL (after migration)
-- Optionally uncomment if you want to enforce this
-- ALTER TABLE purchases ALTER COLUMN level_id SET NOT NULL;

-- Create or recreate the index on level_id
DROP INDEX IF EXISTS purchases_level_id_idx;
CREATE INDEX IF NOT EXISTS purchases_level_id_idx ON purchases(level_id);
