import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const QUALITY_TRANSFORMS: Record<string, string> = {
  Auto: "q_auto:best,f_auto",
  "360p": "h_360,q_auto",
  "480p": "h_480,q_auto",
  "720p": "h_720,q_auto",
  "1080p": "h_1080,q_auto:best",
}

function normalizeQuality(rawValue: string | null | undefined) {
  const normalized = (rawValue ?? "Auto").toString().trim().toLowerCase()
  switch (normalized) {
    case "360p":
      return "360p"
    case "480p":
      return "480p"
    case "720p":
      return "720p"
    case "1080p":
      return "1080p"
    default:
      return "Auto"
  }
}

function applyCloudinaryTransformation(videoUrl: string, desiredQuality: string) {
  try {
    const transformation = QUALITY_TRANSFORMS[desiredQuality] ?? QUALITY_TRANSFORMS.Auto
    const parsedUrl = new URL(videoUrl)
    const uploadPrefix = "/video/upload/"

    if (!parsedUrl.pathname.startsWith(uploadPrefix)) {
      return videoUrl
    }

    const pathAfterUpload = parsedUrl.pathname.slice(uploadPrefix.length)
    parsedUrl.pathname = `${uploadPrefix}${transformation}/${pathAfterUpload}`
    return parsedUrl.toString()
  } catch {
    return videoUrl
  }
}

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

  const requestUrl = new URL(request.url)
  const videoId = requestUrl.searchParams.get("video_id")
  if (!videoId) {
    return NextResponse.json({ error: "video_id is required" }, { status: 400 })
  }

  const requestedQuality = normalizeQuality(requestUrl.searchParams.get("quality"))

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, course_id, title, video_url, level")
    .eq("id", videoId)
    .single()

  if (videoError || !video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 })
  }

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", userData.user.id)
    .eq("level_number", video.level)
    .single()

  if (purchaseError || !purchase) {
    return NextResponse.json({ error: "Video locked" }, { status: 403 })
  }

  const transformedVideoUrl = applyCloudinaryTransformation(video.video_url, requestedQuality)
  const signedUrl = new URL(transformedVideoUrl)
  signedUrl.searchParams.set("fl", "progressive")
  signedUrl.searchParams.set("download", "false")

  return NextResponse.redirect(signedUrl.toString())
}
