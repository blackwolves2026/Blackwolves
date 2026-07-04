import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
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
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: "Failed to verify user role" }, { status: 500 })
    }

    if (userProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const courseId = body?.course_id?.toString().trim()
    if (!courseId) {
      return NextResponse.json({ error: "course_id is required" }, { status: 400 })
    }

    const { data: course } = await supabase
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .maybeSingle()

    if (!course?.id) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const { data: existingLevels, error: existingError } = await supabase
      .from("levels")
      .select("id")
      .eq("course_id", courseId)
      .limit(1)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: "Failed to check existing levels" }, { status: 500 })
    }

    if (existingLevels?.id) {
      const { data: levels } = await supabase
        .from("levels")
        .select("id, title, level_order, price")
        .eq("course_id", courseId)
        .order("level_order")
      return NextResponse.json({ levels: levels || [] })
    }

    const defaultLevels = [
      {
        title: "المستوى 1",
        description: "مقدمة وتعريفات أساسية للبدء.",
        course_id: courseId,
        level_order: 1,
        price: 0,
      },
      {
        title: "المستوى 2",
        description: "بناء المهارات الأساسية وتطبيقها.",
        course_id: courseId,
        level_order: 2,
        price: 0,
      },
      {
        title: "المستوى 3",
        description: "توسيع المعرفة مع تمارين متقدمة.",
        course_id: courseId,
        level_order: 3,
        price: 0,
      },
      {
        title: "المستوى 4",
        description: "المرحلة النهائية ومشاريع التطبيق.",
        course_id: courseId,
        level_order: 4,
        price: 0,
      },
    ]

    const { data: createdLevels, error: createError } = await supabase
      .from("levels")
      .insert(defaultLevels)
      .select("id, title, level_order, price")

    if (createError) {
      return NextResponse.json({ error: createError.message || "Failed to create default levels" }, { status: 500 })
    }

    return NextResponse.json({ levels: createdLevels || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
