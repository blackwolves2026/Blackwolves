import crypto from "crypto"
import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { isAdminRole } from "@/lib/auth"

const CLOUDINARY_API_BASE = "https://api.cloudinary.com/v1_1/debg9gmh7"
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY?.trim()
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET?.trim()
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

function getAuthHeader() {
  if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Missing Cloudinary API credentials")
  }
  return `Basic ${Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString("base64")}`
}

export async function POST(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 })
  }

  try {
    const formData = await request.formData()
    const title = String(formData.get("title") ?? "").trim()
    const orderIndex = Number(formData.get("order_index") ?? 0)
    const levelNumber = Number(formData.get("level_number"))
    const file = formData.get("file")

    if (!title || !file || !(file instanceof File) || !Number.isFinite(levelNumber) || levelNumber <= 0) {
      return NextResponse.json({ error: "Missing title, file, or level_number" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // ignore
          }
        },
      },
    })

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userRow, error: userRowError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle()

    if (userRowError) {
      return NextResponse.json({ error: "Failed to verify user role" }, { status: 500 })
    }

    if (!isAdminRole(userRow?.role ?? userData.user.user_metadata?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "vortex_upload"
    const cloudinaryUploadData = new FormData()
    cloudinaryUploadData.append("file", file)
    cloudinaryUploadData.append("resource_type", "video")
    cloudinaryUploadData.append("filename", file.name || "video")
    cloudinaryUploadData.append("content_type", file.type || "video/mp4")
    cloudinaryUploadData.append("upload_preset", uploadPreset)

    const cloudinaryResponse = await fetch(`${CLOUDINARY_API_BASE}/upload`, {
      method: "POST",
      body: cloudinaryUploadData,
    })

    const cloudinaryResult = await cloudinaryResponse.json()
    if (!cloudinaryResponse.ok || !cloudinaryResult?.secure_url) {
      return NextResponse.json(
        { error: cloudinaryResult?.error?.message || "Failed to upload video to Cloudinary" },
        { status: 500 },
      )
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { error } = await supabaseAdmin.from("videos").insert([
      {
        course_id: "01c2ad78-98fd-44cf-8e7a-9a6e195f4062",
        title,
        video_url: cloudinaryResult.secure_url,
        order_index: Number.isFinite(orderIndex) ? orderIndex : 0,
        level: levelNumber,
      },
    ])

    if (error) {
      return NextResponse.json({ error: error.message || "Failed to save video in the system" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error while uploading video" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  const videoId = new URL(request.url).searchParams.get("video_id")
  if (!videoId) {
    return NextResponse.json({ error: "video_id is required" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    SUPABASE_URL!,
    SUPABASE_ANON_KEY!,
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

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, title, video_url, level")
    .eq("id", videoId)
    .single()

  if (videoError || !video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 })
  }

  const { error: deleteVideoError } = await supabase
    .from("videos")
    .delete()
    .eq("id", videoId)

  if (deleteVideoError) {
    return NextResponse.json({ error: deleteVideoError.message || "Failed to delete video record" }, { status: 500 })
  }

  const urlParts = video.video_url.split("/upload/")
  const afterUpload = urlParts[1]
  const withoutVersion = afterUpload.replace(/^v\d+\//, "")
  const publicId = withoutVersion.replace(/\.[^/.]+$/, "")

  if (!publicId) {
    return NextResponse.json({ error: "Unable to parse Cloudinary public_id" }, { status: 500 })
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const stringToSign = `public_id=${publicId}&timestamp=${timestamp}`
  const signature = crypto.createHash("sha1").update(stringToSign + CLOUDINARY_API_SECRET).digest("hex")

  const formData = new FormData()
  formData.append("public_id", publicId)
  formData.append("timestamp", String(timestamp))
  formData.append("api_key", CLOUDINARY_API_KEY ?? "")
  formData.append("signature", signature)

  const cloudinaryResponse = await fetch(`${CLOUDINARY_API_BASE}/video/destroy`, {
    method: "POST",
    body: formData,
  })

  const cloudinaryResult = await cloudinaryResponse.json()
  if (!cloudinaryResponse.ok || cloudinaryResult.result !== "ok") {
    return NextResponse.json({ error: cloudinaryResult.error?.message || "Failed to delete Cloudinary video" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
