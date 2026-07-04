import { createBrowserClient, type CookieOptions } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

let _client: SupabaseClient | undefined

/**
 * Singleton browser Supabase client.
 * Multiple instances cause auth state desync (sessions get overwritten silently),
 * which is one of the most common reasons "signup seems to do nothing".
 */
export function createClient() {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !anon) {
    console.error("[v0] Missing Supabase env vars", {
      hasUrl: !!url,
      hasAnon: !!anon,
    })
    throw new Error(
      "Supabase env vars are not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local or your environment.",
    )
  }

  console.log("[v0] Creating Supabase browser client", {
    url,
    hasAnonKey: true,
  })
  _client = createBrowserClient(url, anon)
  return _client
}

export type { CookieOptions }
