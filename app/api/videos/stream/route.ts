import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // ignore
          }
        },
      },
    },
  )

  const videoId = new URL(request.url).searchParams.get("video_id")
  if (!videoId) {
    return NextResponse.json({ error: "video_id is required" }, { status: 400 })
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, course_id, title, video_url")
    .eq("id", videoId)
    .single()

  if (videoError || !video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 })
  }

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", userData.user.id)
    .eq("course_id", video.course_id)
    .eq("video_id", videoId)
    .single()

  if (purchaseError || !purchase) {
    return NextResponse.json({ error: "فيديو مقفول" }, { status: 403 })
  }

  const signedUrl = new URL(video.video_url)
  signedUrl.searchParams.set("fl", "progressive")
  signedUrl.searchParams.set("download", "false")

  return NextResponse.redirect(signedUrl.toString())
}
