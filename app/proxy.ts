import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Proxy route is kept minimal for now.
  // The app does not need custom Supabase session proxy logic here.
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
