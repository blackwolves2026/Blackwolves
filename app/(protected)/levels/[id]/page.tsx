import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

interface Props {
  params: { id: string }
}

export default async function LevelDetailPage({ params }: Props) {
  const rawId = String(params?.id ?? "")
  const parsedNumber = Number(rawId)
  const fallbackMatch = rawId.match(/(\d+)$/)
  const levelNumber = Number.isFinite(parsedNumber) && parsedNumber > 0 ? parsedNumber : fallbackMatch ? Number(fallbackMatch[1]) : null

  if (!levelNumber) {
    redirect("/levels")
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: videos, error: videosError } = await supabase
    .from("videos")
    .select("id, title, video_url, order_index, level")
    .eq("level", levelNumber)
    .order("order_index", { ascending: true })

  if (videosError) {
    throw new Error("Failed to load level videos")
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Card className="glass border-border/50 p-6">
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold">Level {levelNumber} details</h1>
          <p className="text-muted-foreground">Videos for level {levelNumber}</p>
          <p className="text-sm text-muted-foreground">
            This page shows the videos that belong to the selected level.
          </p>
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </Card>

      {videos && videos.length > 0 ? (
        <div className="grid gap-4">
          {videos.map((video) => (
            <Card key={video.id} className="glass border-border/50 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-lg font-semibold">{video.title}</div>
                  <div className="text-sm text-muted-foreground">Order: {video.order_index}</div>
                </div>
                <div className="text-sm text-muted-foreground">Level: {video.level}</div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass border-border/50 p-6 text-muted-foreground">
          No videos found for this level yet.
        </Card>
      )}
    </div>
  )
}
