import Link from "next/link"
import { ArrowLeft, BookOpen, Heart, Wallet } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
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
    .from("levels")
    .select("id, title, level_order, price")
    .eq("course_id", course?.id ?? "")
    .order("level_order")

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("level_id, is_purchased, progress")
    .eq("user_id", user!.id)

  const { count: favoritesCount } = await supabase
    .from("favorites")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id)

  const purchased = enrollments?.filter((e) => e.is_purchased).length ?? 0
  const totalProgress =
    enrollments && enrollments.length > 0
      ? Math.round(enrollments.reduce((s, e) => s + Number(e.progress || 0), 0) / enrollments.length)
      : 0

  const stats = [
    { label: "Balance", value: formatCurrency(walletRow?.balance ?? 0), icon: Wallet, color: "text-primary" },
    { label: "Active levels", value: `${purchased}/4`, icon: BookOpen, color: "text-accent" },
    { label: "Favorites", value: String(favoritesCount ?? 0), icon: Heart, color: "text-primary" },
  ]

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-extrabold">
            Hello, <span className="text-gradient">{userRow?.full_name ?? "BLACKWOLVES student"}</span>
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">

        {stats.map((s) => (
          <Card key={s.label} className="glass border-border/50 p-5 flex items-center gap-4">
            <div className={`size-12 rounded-xl bg-secondary grid place-items-center ${s.color}`}>
              <s.icon className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-extrabold">{s.value}</div>
            </div>
          </Card>
        ))}
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

      <Card className="glass border-primary/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Overall progress</h2>
            <p className="text-sm text-muted-foreground">{totalProgress}% complete</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/course">
              Continue <ArrowLeft className="size-4" />
            </Link>
          </Button>
        </div>
        <Progress value={totalProgress} />
      </Card>
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Levels</h2>
            <Link href="/course" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {levels?.map((lv) => {
              const enr = enrollments?.find((e) => e.level_id === lv.id)
              const purchased = !!enr?.is_purchased
              return (
                <Card key={lv.id} className="glass border-border/50 p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Level {lv.level_order}</div>
                    <div className="font-bold">{lv.title}</div>
                    <div className="text-xs text-muted-foreground">{formatCurrency(lv.price)}</div>
                  </div>
                  <Button asChild size="sm" variant={purchased ? "default" : "outline"}>
                    <Link href={`/levels/${lv.id}`}>{purchased ? "Enter" : "Details"}</Link>
                  </Button>
                </Card>
              )
            })}
          </div>
        </div>
    </div>
  )
}
