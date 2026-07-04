-- Update purchases to reference level_id instead of video_id
ALTER TABLE levels
  ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS level_id TEXT;

UPDATE videos
SET level_id = l.id
FROM levels l
WHERE videos.course_id = l.course_id
  AND videos.level::text = l.level_order::text
  AND videos.level_id IS NULL;

ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS level_id TEXT;

UPDATE purchases
SET level_id = l.id
FROM videos v
JOIN levels l ON l.course_id = v.course_id AND v.level::text = l.level_order::text
WHERE purchases.video_id = v.id
  AND purchases.level_id IS NULL;

DROP INDEX IF EXISTS purchases_level_id_idx;
CREATE INDEX IF NOT EXISTS purchases_level_id_idx ON purchases(level_id);

DROP INDEX IF EXISTS videos_level_id_idx;
CREATE INDEX IF NOT EXISTS videos_level_id_idx ON videos(level_id);

ALTER TABLE purchases
  DROP COLUMN IF EXISTS video_id;
