"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export function BackButton() {
  const router = useRouter()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => router.back()}
      className="inline-flex min-h-[44px] min-w-[44px] rounded-full border-primary/50 bg-card/85 px-3 text-primary shadow-[0_0_0_1px_rgba(212,175,55,0.15)] backdrop-blur-xl"
      aria-label="Go back"
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
    >
      <ArrowLeft className="size-4" />
      <span className="hidden sm:inline">Back</span>
    </Button>
  )
}
