"use client"

import Link from "next/link"

export function PublicFooter() {
  return (
    <footer className="border-t border-border/50 bg-card/30 mt-20">
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-2">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-3 cursor-default">
            <img src="/wolf-logo.png" alt="BLACKWOLVES" className="h-10 w-auto" />
            <span className="font-bold">BLACKWOLVES</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            BLACKWOLVES is a professional trading education platform with structured course levels, interactive videos, and personalized progress tracking.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="font-bold">Quick links</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/#features" className="hover:text-foreground">Features</Link></li>
            <li><Link href="/#course" className="hover:text-foreground">Course</Link></li>
            <li><Link href="/auth/login" className="hover:text-foreground">Login</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/50 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BLACKWOLVES — All rights reserved
      </div>
    </footer>
  )
}
