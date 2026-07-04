-- Remove broad policy so only purchased videos are visible to students.
DROP POLICY IF EXISTS "students can view videos" ON public.videos;
