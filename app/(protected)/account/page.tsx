import Link from "next/link"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { formatCurrency } from "@/lib/format"
import { ShieldCheck } from "lucide-react"

export default async function AccountPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: userRow, error } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user?.id)
    .single()

  const { data: walletRow } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", user?.id)
    .maybeSingle()

  return (
    <div className="max-w-4xl space-y-6">
      <Card className="glass border-border/50 p-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold">My Account</h1>
              <p className="text-sm text-muted-foreground">Your account details on the platform.</p>
            </div>
            <Link href="/wallet/add-funds" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
              Add funds
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-border/50 bg-background/80 p-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Full name</div>
              <div className="mt-2 text-lg font-semibold">{userRow?.full_name ?? user?.user_metadata?.full_name ?? "Unknown"}</div>
            </div>
            <div className="rounded-3xl border border-border/50 bg-background/80 p-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Email</div>
              <div className="mt-2 text-lg font-semibold">{user?.email ?? "Not available"}</div>
            </div>
            <div className="rounded-3xl border border-border/50 bg-background/80 p-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Balance</div>
              <div className="mt-2 text-lg font-semibold">{formatCurrency(walletRow?.balance ?? 0)}</div>
            </div>
          </div>

          <div className="rounded-3xl border border-border/50 bg-background/80 p-5">
            <h2 className="text-xl font-semibold">Account status</h2>
            <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
              {userRow?.role === "admin" && <ShieldCheck className="size-4 text-emerald-500" />}
              {error ? "Unable to load account data." : `Role: ${userRow?.role === "admin" ? "Admin" : "User"}`}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
