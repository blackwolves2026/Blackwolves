import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ADMIN_ROLES } from "@/lib/auth"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: userRow, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = String(userRow?.role ?? "")
    .toLowerCase()
    .trim()
    .replace(/[-\s]+/g, "_")

  if (error || !role || !ADMIN_ROLES.includes(role)) {
    redirect("/dashboard")
  }

  return <>{children}</>
}
