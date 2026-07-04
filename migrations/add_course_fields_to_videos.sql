-- Add video metadata columns for Cloudinary uploads and course association
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS course_id TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS order_index INT,
ADD COLUMN IF NOT EXISTS level_id TEXT,
ADD COLUMN IF NOT EXISTS price NUMERIC;
