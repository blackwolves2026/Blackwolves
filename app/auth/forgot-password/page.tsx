"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { CheckCircle2, Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })

      if (error) {
        toast.error(error.message || "Unable to send password reset link")
        return
      }

      setSent(true)
      toast.success("A password reset link has been sent to your email")
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
            <h1 className="text-2xl font-extrabold">Forgot your password?</h1>
            <p className="text-sm text-muted-foreground">Enter your email and we will send a link to reset your password.</p>
          </div>

          {sent ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="size-4" />
                Reset link sent
              </div>
              <p>Please check your inbox or spam folder, then follow the link to set a new password.</p>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="pr-10"
                />
              </div>
            </div>

            <Button type="submit" className="w-full glow-primary" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Send reset link"}
            </Button>
          </form>

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
