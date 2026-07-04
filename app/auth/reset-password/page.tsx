"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    let mounted = true

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (mounted) {
        setSessionReady(!!session)
        setCheckingSession(false)
      }
    }

    void checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSessionReady(!!session)
        setCheckingSession(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!sessionReady) {
      toast.error("The password reset link is invalid or has expired")
      return
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        toast.error(error.message || "Unable to update password")
        return
      }

      toast.success("Password updated successfully")
      router.push("/auth/login")
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 grid-bg">
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="glass border-primary/30 p-8 space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-extrabold">Reset password</h1>
            <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
          </div>

          {checkingSession ? (
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground text-center">
              <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
              Verifying link...
            </div>
          ) : !sessionReady ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="size-4" />
                Invalid link
              </div>
              <p className="mt-2">You cannot reset your password without a valid link. Please request a new one.</p>
              <div className="mt-4 text-center">
                <Link href="/auth/forgot-password" className="text-primary hover:underline">
                  Request a new link
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  dir="ltr"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  dir="ltr"
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" className="w-full glow-primary" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Update password"}
              </Button>
            </form>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <Link href="/auth/login" className="text-primary hover:underline">
              Back to login
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
