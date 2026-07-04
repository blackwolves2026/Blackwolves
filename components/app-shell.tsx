"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Bell,
  BookOpen,
  Heart,
  LayoutDashboard,
  LogOut,
  Settings,
  Wallet,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { BackButton } from "@/components/back-button"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useWallet } from "@/lib/wallet-context"
import { formatCurrency } from "@/lib/format"
import { useEffect, useState, type ReactNode } from "react"
import { ADMIN_ROLES, normalizeRole } from "@/lib/auth"

type Profile = { role: string; full_name: string | null; email: string | null; wallet: number }

const userLinks: { href: string; label: string; icon: any; userOnly?: boolean }[] = [
  { href: "/course", label: "Course", icon: BookOpen },
  { href: "/wallet", label: "Wallet", icon: Wallet, userOnly: true },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/account", label: "Account", icon: User },
]

const adminLinks = [
  { href: "/admin", label: "Admin Panel", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: User },
  { href: "/admin/videos", label: "Videos", icon: BookOpen },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
  { href: "/admin/analytics", label: "Analytics", icon: Settings },
]

export function AppShell({ children, profile }: { children: ReactNode; profile: Profile | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const normalizedRole = normalizeRole(profile?.role ?? "user")
  const isAdminRole = ADMIN_ROLES.includes(normalizedRole)
  const { wallet } = useWallet()
  const [unreadCount, setUnreadCount] = useState(0)

  // فلترة اللينكات: إظهار روابط المحفظة والمفضلة للمستخدم العادي فقط وإخفائها عن الأدمن
  const filteredUserLinks = userLinks.filter(l => {
    if (isAdminRole && l.userOnly) return false
    return true
  })

  // تحديد أيقونات الموبايل (4 أيقونات فقط) بناءً على الرتبة
  const mobileLinks = isAdminRole 
    ? [
        { href: "/dashboard", label: "Home", icon: LayoutDashboard },
        { href: "/admin/payments", label: "Payments", icon: Wallet },
        { href: "/notifications", label: "Notifications", icon: Bell },
        { href: "/account", label: "Account", icon: User },
      ]
    : [
        { href: "/dashboard", label: "Home", icon: LayoutDashboard },
        { href: "/wallet", label: "Wallet", icon: Wallet },
        { href: "/course", label: "Course", icon: BookOpen },
        { href: "/account", label: "Account", icon: User },
      ]

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    async function refreshUnreadCount(userId: string) {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .or("is_read.eq.false,is_read.is.null")

      if (!mounted) return

      setUnreadCount(error ? 0 : count ?? 0)
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return

      await refreshUnreadCount(user.id)

      const channel = supabase.channel(`notifications:${user.id}`)

      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void refreshUnreadCount(user.id)
        },
      )

      channel.subscribe()
    }

    void init()

    return () => {
      mounted = false
      supabase.removeAllChannels()
    }
  }, [])

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success("Signed out successfully")
    router.push("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex fixed inset-y-0 right-0 w-64 flex-col border-l border-border/50 bg-sidebar/60 backdrop-blur-xl">
        <div className="p-5 border-b border-border/50">
          <div className="inline-flex items-center gap-3 cursor-default">
            <img src="/wolf-logo.png" alt="BLACKWOLVES" className="h-10 w-auto" />
            <span className="font-semibold">BLACKWOLVES</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
          <SectionLabel>Menu</SectionLabel>
          <NavLink href="/dashboard" active={pathname === "/dashboard"} icon={LayoutDashboard}>
            Home
          </NavLink>

          {isAdminRole && (
            <>
              <SectionLabel>Admin Panel</SectionLabel>
              {adminLinks.map((l) => (
                <NavLink
                  key={l.href}
                  href={l.href}
                  active={
                    pathname === l.href || 
                    (l.href !== "/admin" && pathname.startsWith(l.href + "/"))
                  }
                  icon={l.icon}
                >
                  {l.label}
                </NavLink>
              ))}
            </>
          )}

          <SectionLabel>Services</SectionLabel>
          {filteredUserLinks.map((l) => (
            <NavLink key={l.href} href={l.href} active={pathname === l.href} icon={l.icon}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border/50 space-y-2">
          <div className="rounded-xl bg-secondary/50 p-3">
            <div className="text-xs text-muted-foreground">Balance</div>
            <div className="font-bold text-primary">
              {formatCurrency(wallet ?? profile?.wallet ?? 0)}
            </div>
          </div>
          <Button onClick={logout} variant="ghost" className="w-full justify-start gap-2 text-destructive">
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Topbar (mobile) */}
      <header className="lg:hidden sticky top-0 z-40 glass border-b border-border/50">
        <div className="flex items-center justify-between px-3 h-14">
          <div className="inline-flex items-center gap-2 cursor-default">
            <img src="/wolf-logo.png" alt="BLACKWOLVES" className="h-8 w-auto" />
          </div>
          <div className="flex items-center gap-1">
            <BackButton />
            <ThemeToggle />
            <Button asChild variant="ghost" size="icon" className="relative">
              <Link href="/notifications">
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            </Button>
            <Button onClick={logout} variant="ghost" size="icon" aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="lg:mr-64 pb-24 lg:pb-10">
        <div className="hidden lg:flex sticky top-0 z-30 items-center justify-between px-6 py-4 glass border-b border-border/50">
          <div className="text-sm text-muted-foreground">
            {profile?.full_name ?? profile?.email ?? "BLACKWOLVES"}
          </div>
          <div className="flex items-center gap-2">
            <BackButton />
            <ThemeToggle />
            <Button asChild variant="ghost" size="icon" className="relative">
              <Link href="/notifications">
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/wallet/add-funds">Top up wallet</Link>
            </Button>
          </div>
        </div>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 md:p-6 lg:p-8"
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border/50">
        <div className="grid grid-cols-4">
          {mobileLinks.map((l) => {
            const active = pathname === l.href
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 text-xs transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <l.icon className="size-5" />
                <span>{l.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">{children}</div>
}

function NavLink({
  href,
  active,
  icon: Icon,
  children,
}: {
  href: string
  active: boolean
  icon: React.ComponentType<{ className?: string }>
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      <span>{children}</span>
    </Link>
  )
}
