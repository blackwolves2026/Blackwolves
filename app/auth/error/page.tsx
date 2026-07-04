import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen grid place-items-center px-4 text-center">
      <div className="space-y-4">
        <h1 className="text-3xl font-extrabold">Authentication error</h1>
        <p className="text-muted-foreground">Please try again.</p>
        <Button asChild>
          <Link href="/auth/login">Return to login</Link>
        </Button>
      </div>
    </div>
  )
}
