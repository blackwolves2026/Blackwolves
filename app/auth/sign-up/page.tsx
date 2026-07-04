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

function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "This email is already registered. Please log in instead."
  }
  if (m.includes("password") && m.includes("6")) return "Password is too short. Minimum 6 characters."
  if (m.includes("invalid email")) return "Invalid email address."
  if (m.includes("rate limit")) return "Too many attempts. Please try again later."
  return message
}

export default function SignUpPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setDebugInfo(null)

    try {
      const supabase = createClient()
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { 
            full_name: fullName.trim(),
            role: 'user'
          },
        },
      })

      if (signUpErr) {
        toast.error(translateAuthError(signUpErr.message))
        return
      }

      if (data?.user && (data.user.identities?.length ?? 0) === 0) {
        toast.error("This email is already registered. Please log in instead.")
        return
      }

      if (data?.session && data.user) {
        const role = getEffectiveRole(undefined, data.user.user_metadata?.role ?? null)

        const { error: notificationError } = await supabase.from("notifications").insert([
          {
            user_id: data.user.id,
            message: "Welcome to BLACKWOLVES",
            is_read: false,
          },
        ])

        if (notificationError) {
          // eslint-disable-next-line no-console
          console.warn('Failed to create welcome notification after signup', notificationError)
        }

          toast.success("Welcome to BLACKWOLVES")
        return
      }

      toast.error("Account created but automatic sign-in failed. Please sign in manually.")
      router.push("/auth/login")
    } catch (err) {
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
            <h1 className="text-2xl font-extrabold">Join BLACKWOLVES</h1>
            <p className="text-sm text-muted-foreground">Create your account and start learning today</p>
          </div>

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
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
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
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full glow-primary" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
            </Button>
          </form>
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
