import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const COURSE_ID = "01c2ad78-98fd-44cf-8e7a-9a6e195f4062"

export async function POST(request: Request) {
  const body = await request.json()
  const levelNumber = Number(body?.level_number)

  if (!Number.isFinite(levelNumber) || levelNumber <= 0) {
    return NextResponse.json({ error: "level_number is required" }, { status: 400 })
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

  const { data: level, error: levelError } = await supabase
    .from("level_prices")
    .select("level_number, price")
    .eq("level_number", levelNumber)
    .single()

  if (levelError || !level) {
    return NextResponse.json({ error: "Level not found" }, { status: 404 })
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
    .eq("level_number", level.level_number)
    .single()

  if (existingPurchase?.id) {
    return NextResponse.json({ success: true })
  }

  const price = Number(level.price ?? 0)
  if (wallet.balance < price) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 402 })
  }

  const { error: walletUpdateError } = await supabase
    .from("wallets")
    .update({ balance: wallet.balance - price })
    .eq("user_id", userId)

  if (walletUpdateError) {
    return NextResponse.json({ error: "Failed to update wallet" }, { status: 500 })
  }

  const { error: purchaseError } = await supabase.from("purchases").insert([
    {
      user_id: userId,
      course_id: COURSE_ID,
      level_number: level.level_number,
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
          error: "Failed to create purchase and failed to restore wallet. Contact support.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ error: purchaseError.message || "Failed to create purchase" }, { status: 500 })
  }

  const { data: existingEnrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("level_number", level.level_number)
    .single()

  if (existingEnrollment?.id) {
    await supabase
      .from("enrollments")
      .update({ is_purchased: true })
      .eq("id", existingEnrollment.id)
  } else {
    await supabase.from("enrollments").insert([
      {
        user_id: userId,
        level_number: level.level_number,
        is_purchased: true,
        progress: 0,
      },
    ])
  }

  await supabase.from("notifications").insert([
    {
      user_id: userId,
      message: "Level purchased successfully",
      is_read: false,
    },
  ])

  return NextResponse.json({ success: true })
}
