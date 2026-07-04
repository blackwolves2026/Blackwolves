import { createClient } from "@/lib/supabase/server"
import { AppShell } from "@/components/app-shell"
import { WalletProvider } from "@/lib/wallet-context"
import { redirect } from "next/navigation"
import { getEffectiveRole } from "@/lib/auth"

// force the page to be dynamic to avoid auth cache issues
export const dynamic = "force-dynamic"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // In development allow viewing protected routes without redirecting so
    // the admin UI can be checked locally. Production still redirects.
    if (process.env.NODE_ENV !== 'development') {
      redirect("/auth/login")
    }

    return (
      <WalletProvider initialBalance={0}>
        <AppShell
          profile={{
              email: "guest@example.com",
              full_name: "Guest",
              role: "user",
              wallet: 0,
            }}
        >
          {children}
        </AppShell>
      </WalletProvider>
    )
  }

  // fetch profile data with fallback handling when missing
  const { data: userRow } = await supabase
    .from("users")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle()

  const { data: walletRow } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle()

  const effectiveProfile = {
    id: userRow?.id ?? user.id,
    email: userRow?.email ?? user.email,
    full_name: userRow?.full_name ?? user.user_metadata?.full_name ?? "New user",
    role: getEffectiveRole(userRow?.role ?? null, user.user_metadata?.role ?? null),
    wallet: walletRow?.balance ?? 0,
  }

  // pass profile object or safe default values
  return (
    <WalletProvider initialBalance={effectiveProfile.wallet}>
      <AppShell
        profile={effectiveProfile as any}
      >
        {children}
      </AppShell>
    </WalletProvider>
  )
}
