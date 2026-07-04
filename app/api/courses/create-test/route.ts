import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
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

    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (userProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Create test course
    const { data, error } = await supabase
      .from("courses")
      .insert([
        {
          title: "VORTEX",
          description: "Default course created for upload testing",
        },
      ])
      .select("id")
      .maybeSingle()

    if (error || !data?.id) {
      return NextResponse.json({ error: error?.message || "Unable to create test course." }, { status: 500 })
    }

    const defaultLevels = [
      {
        title: "المستوى 1",
        description: "مقدمة وتعريفات أساسية للبدء.",
        course_id: data.id,
        level_order: 1,
        price: 0,
      },
      {
        title: "المستوى 2",
        description: "بناء المهارات الأساسية وتطبيقها.",
        course_id: data.id,
        level_order: 2,
        price: 0,
      },
      {
        title: "المستوى 3",
        description: "توسيع المعرفة مع تمارين متقدمة.",
        course_id: data.id,
        level_order: 3,
        price: 0,
      },
      {
        title: "المستوى 4",
        description: "المرحلة النهائية ومشاريع التطبيق.",
        course_id: data.id,
        level_order: 4,
        price: 0,
      },
    ]

    const { error: levelsError } = await supabase.from("levels").insert(defaultLevels)
    if (levelsError) {
      return NextResponse.json({ error: levelsError.message || "Failed to create default levels." }, { status: 500 })
    }

    return NextResponse.json({ success: true, course: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
