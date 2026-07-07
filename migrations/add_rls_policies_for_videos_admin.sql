-- Add INSERT, UPDATE, DELETE policies for videos table to allow admins to manage videos
CREATE POLICY IF NOT EXISTS "admins can insert videos" ON public.videos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin', 'content_manager', 'finance_manager', 'administrator')
    )
  );

CREATE POLICY IF NOT EXISTS "admins can update videos" ON public.videos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin', 'content_manager', 'finance_manager', 'administrator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin', 'content_manager', 'finance_manager', 'administrator')
    )
  );

CREATE POLICY IF NOT EXISTS "admins can delete videos" ON public.videos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin', 'content_manager', 'finance_manager', 'administrator')
    )
  );
