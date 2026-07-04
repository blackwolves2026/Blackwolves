import { createClient } from "@/lib/supabase/server"
import CourseVideoSection, { type CourseVideoItem, type LevelInfo } from "@/components/course-video-section"

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
    .select("id, title, order_index, level")
    .eq("course_id", COURSE_ID)
    .order("order_index", { ascending: true })

  const { data: levels, error: levelsError } = await supabase
    .from("level_prices")
    .select("level_number, price")
    .order("level_number", { ascending: true })

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  const courseVideos: CourseVideoItem[] = videos ?? []
  const courseLevels: LevelInfo[] =
    (levels ?? []).map((level) => ({
      id: String(level.level_number),
      title: `Level ${level.level_number}`,
      level_number: level.level_number,
      price: Number(level.price ?? 0),
    }))

  const { data: purchases } = await supabase
    .from("purchases")
    .select("level_number")
    .eq("user_id", userId ?? "")

  if (courseError || !course) {
    throw new Error("Failed to load course data")
  }

  if (videosError || levelsError) {
    throw new Error("Failed to load course content")
  }

  const purchasedLevelIds = purchases
    ? purchases
        .map((purchase) => String((purchase as { level_number?: number }).level_number))
        .filter((id): id is string => Boolean(id))
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

        <CourseVideoSection
          videos={courseVideos}
          levels={courseLevels}
          purchasedLevelIds={purchasedLevelIds}
        />
      </div>
    </div>
  )
}
