"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { createClient } from "@/lib/supabase/client"

const links = [
  { href: "/", label: "Home" },
  { href: "/#features", label: "Features" },
  { href: "/#course", label: "Course" },
]

const loggedInLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/course", label: "Course" },
  { href: "/wallet", label: "Wallet" },
  { href: "/notifications", label: "Notifications" },
  { href: "/account", label: "Account" },
]

export function PublicHeader() {
  const [open, setOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    const syncAuth = (session: any) => {
      if (!mounted) return
      setIsLoggedIn(Boolean(session?.user?.id))
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      syncAuth(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncAuth(session)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const closeMenu = () => setOpen(false)

  const goTo = (href: string) => {
    closeMenu()
    window.location.href = href
  }

  return (
    <header className="sticky top-0 border-b border-border/50 bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-2 cursor-default">
          <img src="/wolf-logo.png" alt="BLACKWOLVES" className="h-10 w-auto" />
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {(isLoggedIn ? loggedInLinks : links).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Button asChild variant="ghost" className="hidden min-h-[44px] min-w-[44px] sm:inline-flex">
            <Link href="/auth/login">Login</Link>
          </Button>

          <Button asChild className="glow-primary hidden min-h-[44px] sm:inline-flex">
            <Link href="/auth/sign-up">Join now</Link>
          </Button>

        </div>
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[49] bg-transparent md:hidden"
            onPointerDown={closeMenu}
          />

          <div className="fixed inset-x-0 top-16 z-[50] border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden">
            <div className="container mx-auto flex flex-col gap-1 px-3 py-4">
              <div className="flex flex-col gap-2">
                {(isLoggedIn ? loggedInLinks : links).map((l) => (
                  <button
                    key={l.href}
                    type="button"
                    onPointerDown={() => {
                      goTo(l.href)
                    }}
                    className="min-h-[44px] w-full rounded-lg px-3 py-2 text-right hover:bg-secondary"
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              {!isLoggedIn ? (
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="min-h-[44px] w-full"
                    onPointerDown={() => {
                      goTo("/auth/login")
                    }}
                  >
                    Login
                  </Button>

                  <Button
                    className="glow-primary min-h-[44px] w-full"
                    onPointerDown={() => {
                      goTo("/auth/sign-up")
                    }}
                  >
                    Join now
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </header>
  )
}
