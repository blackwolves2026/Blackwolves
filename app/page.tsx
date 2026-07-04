"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, GraduationCap, PlayCircle, ShieldCheck, Sparkles, Trophy, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"

const features = [
  { icon: GraduationCap, title: "Four professional levels", desc: "From fundamentals to mastery in market analysis and confident trading decisions." },
  { icon: PlayCircle, title: "Advanced learning videos", desc: "Structured video lessons explain forex strategies and global markets step by step." },
  { icon: ShieldCheck, title: "Secure access", desc: "Content is protected inside the platform with full rights management." },
  { icon: Sparkles, title: "Progress tracking", desc: "Clear progress tracking across every level with smart performance markers." },
  { icon: Trophy, title: "Wallet and fast top-up", desc: "Top up your balance and pay for levels with a simple secure flow." },
  { icon: Users, title: "Real-time alerts", desc: "Instant notifications when top-ups are approved or new levels become available." },
]

const stats = [
  { num: "12,000+", label: "Members" },
  { num: "98%", label: "Satisfaction Rate" },
  { num: "50+", label: "Videos" },
  { num: "6", label: "Years of Experience" },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
          <div className="absolute -top-32 -right-32 size-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-accent/20 blur-3xl pointer-events-none" />

          <div className="container mx-auto px-4 py-20 md:py-28 relative">
            <div className="grid items-center gap-10 md:grid-cols-2">
              <motion.div
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs text-primary">
                  <Sparkles className="size-3" /> BLACKWOLVES platform
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-balance">
                  Master <span className="text-gradient">trading</span> with instructor <span className="whitespace-nowrap">Ziad Ahmed</span>
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed text-pretty">
                  Join thousands of students on a path to trading excellence with a professional curriculum, high-quality videos, and intelligent progress tracking.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg" className="glow-primary">
                    <Link href="/auth/sign-up">
                      Start for free <ArrowLeft className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/#course">Browse course</Link>
                  </Button>
                  {/* admin link intentionally hidden on public homepage; shown after login for admins */}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 max-w-full justify-items-center">
                  {stats.map((s) => (
                    <div key={s.label} className="text-center min-w-[105px]">
                      <div className="text-2xl font-extrabold text-gradient">{s.num}</div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="relative hidden md:block"
              >
                <div className="relative aspect-square max-w-md mx-auto">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 blur-3xl animate-pulse-glow" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="features" className="container mx-auto px-4 py-20">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl md:text-4xl font-extrabold">Why BLACKWOLVES?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete platform designed to deliver the best digital trading experience.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
              >
                <Card className="glass border-border/50 p-6 h-full hover:border-primary/40 transition-colors group">
                  <div className="size-12 rounded-xl bg-primary/15 grid place-items-center text-primary mb-4 group-hover:glow-primary transition-shadow">
                    <f.icon className="size-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="about" className="container mx-auto px-4 py-20">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] items-start">
            <div className="space-y-6 max-w-3xl">
              <div className="space-y-3 max-w-2xl">
                <div className="text-xs text-accent uppercase tracking-wider">About BlackWolves</div>
                <h2 className="text-3xl md:text-4xl font-extrabold">The #1 trading education platform in the Middle East</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  BlackWolves is the leading trading education platform in the Middle East, serving over 12,000 members and backed by 6 years of real market experience.
                </p>
              </div>
              <div className="rounded-3xl border border-border/50 bg-background/90 p-8 shadow-sm">
                <div className="space-y-4">
                  <div>
                    <div className="text-4xl font-extrabold">Ziad Ahmed</div>
                    <div className="text-sm tracking-[0.24em] uppercase text-muted-foreground">
                      FOUNDER & CEO
                    </div>
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">
                    With over 6 years of trading experience in global markets, Ziad Ahmed has established himself as one of the leading trading educators in the MENA region. His journey from a passionate beginner to a successful professional trader inspired him to create BlackWolves Academy. As Founder and CEO, Ziad has mentored thousands of traders, helping them develop the skills, mindset, and discipline needed to succeed in the markets. His teaching philosophy combines technical expertise with practical wisdom, ensuring students not only learn strategies but also understand when and how to apply them.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="course" className="container mx-auto px-4 py-20">
          <Card className="glass border-primary/30 p-8 md:p-12 relative overflow-hidden">
            <div className="absolute -top-20 -left-20 size-72 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
            <div className="grid gap-8 md:grid-cols-2 items-center relative">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">
                  The only course on the platform
                </div>
                <h2 className="text-3xl md:text-5xl font-extrabold">
                  VORTEX <span className="text-gradient">Course</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  A complete curriculum of four sequential levels that takes you from fundamentals to full mastery, with personalized guidance from instructor Ziad Ahmed.
                </p>
                <ul className="space-y-2 text-sm">
                  {[
                    "Level 1 — Fundamentals",
                    "Level 2 — Intermediate",
                    "Level 3 — Advanced skills",
                    "Level 4 — Exam mastery",
                  ].map((l) => (
                    <li key={l} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" />
                      {l}
                    </li>
                  ))}
                </ul>
                <Button asChild size="lg" className="glow-primary mt-4">
                  <Link href="/auth/sign-up">Sign up and reserve your spot</Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((n) => (
                  <motion.div
                    key={n}
                    whileHover={{ y: -4 }}
                    className="glass rounded-2xl border border-border/50 p-5 aspect-square grid place-items-center"
                  >
                    <div className="text-center">
                      <div className="text-4xl font-extrabold text-gradient">{n}</div>
                      <div className="text-xs text-muted-foreground mt-1">Level</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </Card>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
