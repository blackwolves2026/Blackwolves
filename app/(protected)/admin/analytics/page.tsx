import { Card } from "@/components/ui/card"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export default async function AdminAnalyticsPage() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div className="max-w-4xl space-y-6">
        <Card className="glass border-border/50 p-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold">Analytics</h1>
            <p className="text-muted-foreground">Missing Supabase server settings (SUPABASE_SERVICE_ROLE_KEY)</p>
          </div>
        </Card>
      </div>
    )
  }

  const service = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data: usersData } = await service.from("users").select("id, role")
  const totalUsers = (usersData || []).length
  const studentsCount = (usersData || []).filter((u: any) => {
    const role = String(u.role ?? "user").toLowerCase()
    return role === "student" || role === "user"
  }).length

  const { data: videosData } = await service.from("videos").select("id")
  const totalVideos = (videosData || []).length

  const { data: purchasesData } = await service.from("purchases").select("level_number")
  const levelNumbers = Array.from(new Set((purchasesData || []).map((p: any) => p.level_number).filter(Boolean)))
  let totalSales = 0
  if (levelNumbers.length > 0) {
    const { data: levelPrices } = await service.from("level_prices").select("level_number, price").in("level_number", levelNumbers)
    const priceMap = new Map((levelPrices || []).map((l: any) => [l.level_number, Number(l.price ?? 0)]))
    totalSales = (purchasesData || []).reduce((sum: number, p: any) => sum + (priceMap.get(p.level_number) || 0), 0)
  }

  const { data: walletsData } = await service.from("wallets").select("balance")
  const totalWallets = (walletsData || []).reduce((s: number, w: any) => s + Number(w.balance ?? 0), 0)

  return (
    <div className="max-w-4xl space-y-6">
      <Card className="glass border-border/50 p-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold">Analytics</h1>
          <p className="text-muted-foreground">Platform-wide analytics overview.</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Total users</div>
          <div className="text-2xl font-bold">{totalUsers}</div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Students</div>
          <div className="text-2xl font-bold">{studentsCount}</div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Total videos</div>
          <div className="text-2xl font-bold">{totalVideos}</div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Total sales</div>
          <div className="text-2xl font-bold">{totalSales} EGP</div>
        </Card>

        <Card className="p-6 md:col-span-2">
          <div className="text-sm text-muted-foreground">Total wallet balances</div>
          <div className="text-2xl font-bold">{totalWallets} EGP</div>
        </Card>
      </div>
    </div>
  )
}

