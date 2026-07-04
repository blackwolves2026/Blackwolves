import crypto from "crypto"
import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { isAdminRole } from "@/lib/auth"

const CLOUDINARY_API_BASE = "https://api.cloudinary.com/v1_1/debg9gmh7"
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY?.trim()
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET?.trim()
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

function getAuthHeader() {
  if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Missing Cloudinary API credentials")
  }
  return `Basic ${Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString("base64")}`
}

export async function POST(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 })
  }

  const body = await request.json()
  const title = body?.title?.toString().trim()
  const video_url = body?.video_url?.toString().trim()
  const order_index = Number(body?.order_index ?? 0)
  const level = body?.level?.toString().trim() ?? "1"
  const price = Number(body?.price ?? 0)

  if (!title || !video_url) {
    return NextResponse.json({ error: "Missing title or video_url" }, { status: 400 })
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
        } catch (error) {
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

  const { error } = await supabase.from("videos").insert([
    {
      course_id: "01c2ad78-98fd-44cf-8e7a-9a6e195f4062",
      title,
      video_url,
      order_index,
      level,
      price,
    },
  ])

  if (error) {
    return NextResponse.json({ error: error.message || "فشل حفظ الفيديو في النظام" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
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
    .select("id, title, video_url, price")
    .eq("id", videoId)
    .single()

  if (videoError || !video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 })
  }

  const { data: purchases, error: purchasesError } = await supabase
    .from("purchases")
    .select("user_id")
    .eq("video_id", videoId)

  if (purchasesError) {
    return NextResponse.json({ error: "Failed to load video purchases" }, { status: 500 })
  }

  const refundAmount = Number(video.price ?? 0)

  for (const purchase of purchases ?? []) {
    const userId = purchase.user_id
    if (!userId) continue

    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("user_id", userId)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json({ error: "Failed to load wallet for purchaser" }, { status: 500 })
    }

    const { error: walletUpdateError } = await supabase
      .from("wallets")
      .update({ balance: wallet.balance + refundAmount })
      .eq("id", wallet.id)

    if (walletUpdateError) {
      return NextResponse.json({ error: "Failed to refund wallet" }, { status: 500 })
    }

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: userId,
          message: `تم حذف الفيديو ${video.title || "الفيديو"} واسترجاع ${refundAmount} جنيه إلى محفظتك`,
          is_read: false,
        },
      ])

    if (notificationError) {
      console.warn("Failed to create refund notification", notificationError)
    }
  }

  const { error: deletePurchasesError } = await supabase
    .from("purchases")
    .delete()
    .eq("video_id", videoId)

  if (deletePurchasesError) {
    return NextResponse.json({ error: deletePurchasesError.message || "Failed to delete video purchases" }, { status: 500 })
  }

  const { error: deleteVideoError } = await supabase
    .from("videos")
    .delete()
    .eq("id", videoId)

  if (deleteVideoError) {
    return NextResponse.json({ error: deleteVideoError.message || "Failed to delete video record" }, { status: 500 })
  }

  const videoUrl = new URL(video.video_url)
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
