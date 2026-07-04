import { createClient } from "@/lib/supabase/server"
import CourseVideoSection, { type CourseVideoItem } from "@/components/course-video-section"

const COURSE_ID = "01c2ad78-98fd-44cf-8e7a-9a6e195f4062"

export default async function CoursePage() {
  const supabase = await createClient()
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("*")
    .eq("id", COURSE_ID)
    .single()

  const { data: videos, error: videosError } = await supabase
    .from("videos")
    .select("id, title, order_index, level, price")
    .eq("course_id", COURSE_ID)
    .order("order_index", { ascending: true })

  const { data: userData, error: userError } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  const courseVideos: CourseVideoItem[] = videos ?? []

  const { data: purchases, error: purchasesError } = await supabase
    .from("purchases")
    .select("video_id")
    .eq("user_id", userId ?? "")

  if (courseError || !course) {
    throw new Error("Failed to load course data")
  }

  if (videosError) {
    throw new Error("Failed to load videos")
  }

  const purchasedVideoIds = purchases
    ? purchases.map((purchase) => String((purchase as { video_id?: string }).video_id)).filter((id): id is string => Boolean(id))
    : []

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="space-y-6">
        <div className="glass border-primary/30 p-6 md:p-8 relative overflow-hidden rounded-3xl">
          <div className="absolute -top-20 -left-20 size-72 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="relative space-y-3">
            <div className="text-xs text-accent uppercase tracking-wider">Course</div>
            <h1 className="text-4xl font-extrabold">
              <span className="text-gradient">{course?.title ?? "VORTEX"}</span>
            </h1>
            <p className="text-muted-foreground">Instructor: {course?.teacher ?? "Ziad Ahmed"}</p>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {course?.description ?? "Browse course levels and available videos for each stage."}
            </p>
          </div>
        </div>

        <CourseVideoSection videos={courseVideos} purchasedVideoIds={purchasedVideoIds} />
      </div>
    </div>
  )
}
