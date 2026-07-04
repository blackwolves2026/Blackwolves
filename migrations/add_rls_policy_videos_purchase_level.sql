-- Enable row level security on videos and allow access only to admins or students who purchased the level.
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "admins can select videos" ON public.videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin', 'content_manager', 'finance_manager', 'administrator')
    )
  );

CREATE POLICY IF NOT EXISTS "students can select purchased videos" ON public.videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM purchases p
      WHERE p.user_id = auth.uid()
        AND p.level_id = videos.level_id
    )
  );
