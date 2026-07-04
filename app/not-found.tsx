import Link from "next/link"

export default function NotFoundPage() {
  return (
    <div className="min-h-screen grid place-items-center px-4 py-20">
      <div className="max-w-xl text-center space-y-6">
        <h1 className="text-5xl font-extrabold">404</h1>
        <p className="text-lg text-muted-foreground">The page you are looking for was not found or has moved.</p>
        <div className="flex flex-col gap-3 sm:flex-row justify-center">
          <Link href="/" className="rounded-full bg-primary px-6 py-3 text-white shadow-lg hover:bg-primary/90">
            Return home
          </Link>
          <Link href="/auth/login" className="rounded-full border border-border px-6 py-3 text-foreground hover:bg-secondary">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
