import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { ArrowRight } from "lucide-react"

async function getAdminCounts() {
  const supabase = await createClient()

  const [{ count: pendingRequests }, { count: videos }, { count: users }] = await Promise.all([
    supabase.from("recharge_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("videos").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }),
  ])

  return {
    pendingRequests: Number(pendingRequests ?? 0),
    videos: Number(videos ?? 0),
    users: Number(users ?? 0),
  }
}

export default async function AdminPage() {
  const counts = await getAdminCounts()

  const adminRoutes = [
    { href: "/admin/users", label: "Users", subtitle: `${counts.users} users` },
    { href: "/admin/videos", label: "Videos", subtitle: `${counts.videos} videos` },
    { href: "/admin/payments", label: "Payments", subtitle: `${counts.pendingRequests} pending` },
    { href: "/admin/analytics", label: "Analytics", subtitle: "View reports" },
  ]

  return (
    <div className="max-w-4xl space-y-6">
      <Card className="glass border-border/50 p-6">
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold">Admin Panel</h1>
          <p className="text-muted-foreground">Fast admin management with easy access to key tasks.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {adminRoutes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="group block p-5 rounded-2xl border border-border/50 bg-background/50 hover:shadow-lg transition flex items-center justify-between"
              >
                <div>
                  <div className="text-lg font-semibold">{route.label}</div>
                  <div className="text-sm text-muted-foreground mt-1">{route.subtitle}</div>
                </div>
                <ArrowRight className="size-5 text-muted-foreground group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
