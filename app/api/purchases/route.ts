import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const body = await request.json()
  const videoId = body?.video_id?.toString().trim()
  if (!videoId) {
    return NextResponse.json({ error: "video_id is required" }, { status: 400 })
  }

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

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = userData.user.id

  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, course_id, price")
    .eq("id", videoId)
    .single()

  if (videoError || !video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 })
  }

  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("id, balance")
    .eq("user_id", userId)
    .single()

  if (walletError || !wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
  }

  const { data: existingPurchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", video.course_id)
    .eq("video_id", video.id)
    .single()

  if (existingPurchase?.id) {
    return NextResponse.json({ success: true })
  }

  const price = Number(video.price ?? 0)
  if (wallet.balance < price) {
    return NextResponse.json({ error: "رصيد غير كافٍ" }, { status: 402 })
  }

  const { error: walletUpdateError } = await supabase
    .from("wallets")
    .update({ balance: wallet.balance - price })
    .eq("user_id", userId)

  if (walletUpdateError) {
    return NextResponse.json({ error: "فشل تحديث المحفظة" }, { status: 500 })
  }

  const { error: purchaseError } = await supabase.from("purchases").insert([
    {
      user_id: userId,
      course_id: video.course_id,
      video_id: video.id,
    },
  ])

  if (purchaseError) {
    const { error: rollbackError } = await supabase
      .from("wallets")
      .update({ balance: wallet.balance })
      .eq("user_id", userId)

    if (rollbackError) {
      return NextResponse.json(
        {
          error:
            "فشل إنشاء عملية الشراء وفشل استرجاع الرصيد. تواصل مع الدعم.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ error: purchaseError.message || "فشل إنشاء عملية الشراء" }, { status: 500 })
  }

  const { error: notificationError } = await supabase
    .from("notifications")
    .insert([
      {
        user_id: userId,
        message: "تم شراء الفيديو بنجاح",
        is_read: false,
      },
    ])

  if (notificationError) {
    console.warn("Failed to create purchase notification", notificationError)
  }

  return NextResponse.json({ success: true })
} 
