import { Card } from "@/components/ui/card"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export default async function AdminUsersPage() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div className="max-w-4xl space-y-6">
        <Card className="glass border-border/50 p-6">
          <div className="space-y-3">
              <h1 className="text-3xl font-extrabold">User Management</h1>
              <p className="text-muted-foreground">Missing Supabase server settings (SUPABASE_SERVICE_ROLE_KEY)</p>
          </div>
        </Card>
      </div>
    )
  }

  const service = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data: usersData, error: usersError } = await service
    .from("users")
    .select("id, full_name, email, role, created_at, wallets(balance)")
    .order("created_at", { ascending: false })

  if (usersError) {
    return (
      <div className="max-w-4xl space-y-6">
        <Card className="glass border-border/50 p-6">
          <div className="space-y-3">
              <h1 className="text-3xl font-extrabold">User Management</h1>
              <p className="text-muted-foreground">Failed to load users: {usersError.message}</p>
          </div>
        </Card>
      </div>
    )
  }

  const users = usersData || []

  return (
    <div className="max-w-6xl space-y-6">
      <Card className="glass border-border/50 p-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold">User Management</h1>
          <p className="text-muted-foreground">A list of all users and their wallet balances.</p>
        </div>
      </Card>

      <Card className="glass border-border/50 p-6 overflow-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="text-sm text-muted-foreground text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Role</th>
              <th className="p-2">Signup date</th>
              <th className="p-2">Balance</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.full_name ?? "-"}</td>
                <td className="p-2">{u.email ?? "-"}</td>
                <td className="p-2">{u.role ?? "user"}</td>
                <td className="p-2">{new Date(u.created_at).toLocaleString()}</td>
                <td className="p-2">{(u.wallets && u.wallets[0]?.balance) ?? 0} EGP</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
