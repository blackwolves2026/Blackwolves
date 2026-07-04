"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export function PurchaseLevelButton({
  levelId,
  price,
  walletBalance,
}: {
  levelId: string
  price: number
  walletBalance: number
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [loading, setLoading] = useState(false)

  async function handlePurchase() {
    if (walletBalance < price) {
      toast.error("Insufficient balance. Please top up your wallet first.")
      router.push("/wallet/add-funds")
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.rpc("purchase_level", { p_level_id: levelId })
      if (error) throw error
      toast.success("Level activated successfully")
      // Temporarily avoid forcing a full router refresh to prevent reload loops.
      // If needed, we can selectively update UI or call `router.refresh()` with
      // additional guards after diagnosing the root cause.
      console.log('Purchase successful — refresh skipped to avoid loop')
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Purchase failed"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handlePurchase} disabled={loading || pending} className="glow-primary">
      {loading ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
      Purchase and activate level
    </Button>
  )
}
