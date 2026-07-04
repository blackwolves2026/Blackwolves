import Link from "next/link"
import { BookOpen, Wallet } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format"
import { redirect } from "next/navigation"
import { getEffectiveRole, isAdminRole } from "@/lib/auth"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: userRow } = await supabase
    .from("users")
    .select("full_name, email, role")
    .eq("id", user!.id)
    .maybeSingle()

  const { data: walletRow } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", user!.id)
    .maybeSingle()

  const effectiveRole = getEffectiveRole(userRow?.role ?? null, user?.user_metadata?.role ?? null)
  if (isAdminRole(effectiveRole)) redirect("/admin")

  const { data: course } = await supabase.from("courses").select("id, title, teacher").maybeSingle()

  const { data: levels } = await supabase
    .from("level_prices")
    .select("level_number, price")
    .order("level_number")

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("level_number, is_purchased, progress")
    .eq("user_id", user!.id)

  const purchased = enrollments?.filter((e) => e.is_purchased).length ?? 0
  const totalProgress =
    enrollments && enrollments.length > 0
      ? Math.round(enrollments.reduce((s, e) => s + Number(e.progress || 0), 0) / enrollments.length)
      : 0

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-extrabold">
            Hello, <span className="text-gradient">{userRow?.full_name ?? "BLACKWOLVES student"}</span>
        </h1>
      </div>

      {userRow?.role === "admin" ? (
        <Card className="glass border-secondary/20 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Admin panel</h2>
              <p className="text-sm text-muted-foreground">Open the admin dashboard to manage requests and content.</p>
            </div>
            <Button asChild className="self-stretch sm:self-auto">
              <Link href="/admin">Open admin dashboard</Link>
            </Button>
          </div>
        </Card>
      ) : null}

      <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Levels</h2>
            <Link href="/course" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {levels?.map((lv: any) => {
              const enr = enrollments?.find((e: any) => e.level_number === lv.level_number)
              const purchased = !!enr?.is_purchased
              return (
                <Card key={lv.level_number} className="glass border-border/50 p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Level {lv.level_number}</div>
                    <div className="font-bold">Level {lv.level_number}</div>
                    <div className="text-xs text-muted-foreground">{formatCurrency(lv.price)}</div>
                  </div>
                  {purchased ? (
                    <Button asChild size="sm" variant="default">
                      <Link href={`/levels/${lv.level_number}`}>Enter</Link>
                    </Button>
                  ) : null}
                </Card>
              )
            })}
          </div>
        </div>
    </div>
  )
}
