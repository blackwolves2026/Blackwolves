"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { BackButton } from "@/components/back-button"
import { createClient } from "@/lib/supabase/client"
import { getEffectiveRole, getRedirectPath } from "@/lib/auth"

function translateAuthError(message: string): { msg: string; hint?: string } {
  const m = message.toLowerCase()
  if (m.includes("invalid login credentials")) {
    return {
      msg: "Incorrect login details",
      hint: "Please check your email and password, then try again.",
    }
  }
  if (m.includes("email not confirmed")) {
    return {
      msg: "Email not confirmed. Please check your inbox and confirm your email first.",
    }
  }
  if (m.includes("rate limit")) return { msg: "Too many attempts. Please try again later." }
  return { msg: message }
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorHint, setErrorHint] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorHint(null)
    setDebugInfo(null)
    console.log("[v0] login: submit", { email })
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      console.log("[v0] login: response", {
        userId: data?.user?.id,
        hasSession: !!data?.session,
        error: error?.message,
      })

      if (error) {
        const t = translateAuthError(error.message)
        setDebugInfo(`signIn error: ${error.message}`)
        if (t.hint) setErrorHint(t.hint)
        toast.error(t.msg)
        return
      }
      if (!data.session || !data.user) {
        setDebugInfo("signIn returned no session and no user")
        toast.error("Unable to create session")
        return
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle()

      const role = getEffectiveRole(userRow?.role ?? null, data.user.user_metadata?.role ?? null)
      toast.success("Signed in successfully")
      router.push(getRedirectPath(role))
    } catch (err) {
      console.error("[v0] login: unexpected", err)
      const msg = err instanceof Error ? err.message : "An unexpected error occurred"
      setDebugInfo(`Unexpected: ${msg}`)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10 grid-bg">
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-4 flex justify-start">
          <BackButton />
        </div>
        <Card className="glass border-primary/30 p-8 space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-extrabold">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to continue your learning journey</p>
          </div>

          {errorHint && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p>{errorHint}</p>
            </div>
          )}

          {debugInfo && (
            <div
              className="rounded-md border border-muted bg-muted/30 p-2 text-[11px] font-mono text-muted-foreground break-words"
              dir="ltr"
            >
              {debugInfo}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                dir="ltr"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full glow-primary" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
          <div className="text-center text-sm text-muted-foreground">
            <Link href="/auth/forgot-password" className="text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/auth/sign-up" className="text-primary hover:underline">
              Create one
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
