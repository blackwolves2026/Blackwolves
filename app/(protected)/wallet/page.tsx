"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/format"
import { toast } from "sonner"
import { Trash2, Loader2 } from "lucide-react"

interface RechargeRequest {
  id: string
  amount: number
  status: string
  created_at: string
  account_number?: string
  transfer_image_url?: string
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-200 border-amber-500/30",
  approved: "bg-emerald-500/10 text-emerald-200 border-emerald-500/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
}

export default function WalletPage() {
  const [walletBalance, setWalletBalance] = useState(0)
  const [requests, setRequests] = useState<RechargeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // fetch wallet balance
      const { data: walletRow } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle()

      setWalletBalance(walletRow?.balance ?? 0)

      // fetch recharge requests
      const { data: requestsData } = await supabase
        .from("recharge_requests")
        .select("id, amount, status, created_at, account_number, transfer_image_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)

      setRequests(requestsData || [])
      setLoading(false)
    }

    loadData()
  }, [])

  async function handleDeleteRequest(requestId: string) {
    setDeletingId(requestId)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("recharge_requests")
        .delete()
        .eq("id", requestId)

      if (error) throw error

      toast.success("Request deleted successfully")
      setRequests(requests.filter((r) => r.id !== requestId))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete request"
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto size-8" /></div>
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <Card className="glass border-border/50 p-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm text-muted-foreground">Available balance</p>
            <div className="text-4xl font-extrabold">{formatCurrency(walletBalance)}</div>
          </div>
          <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
              To submit a top-up request, click Add funds and upload your account number, amount, and transfer image.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/wallet/add-funds" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90">
                Add funds
              </Link>
              <a href="#requests" className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary">
                View requests
              </a>
            </div>
          </div>
        </div>
      </Card>

      <section id="requests" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Wallet requests</h2>
            <p className="text-sm text-muted-foreground">Requests sent to admin for review are shown here.</p>
          </div>
          <Link href="/wallet/add-funds" className="text-sm text-primary hover:underline">
            Submit new request
          </Link>
        </div>

        {!requests || requests.length === 0 ? (
          <Card className="glass border-border/50 p-6 text-sm text-muted-foreground">No recharge requests at the moment.</Card>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => (
              <Card key={request.id} className="glass border-border/50 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Amount</div>
                    <div className="text-2xl font-bold">{formatCurrency(request.amount)}</div>
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[request.status ?? "pending"]}`}>
                    {request.status ?? "pending"}
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Request date</div>
                    <div className="font-medium">{new Date(request.created_at ?? "").toLocaleString("ar-EG")}</div>
                  </div>
                  {request.account_number && (
                    <div>
                      <div className="text-xs text-muted-foreground">Account number</div>
                      <div className="font-medium">{request.account_number}</div>
                    </div>
                  )}
                </div>
                {request.transfer_image_url && (
                  <div className="border border-border/50 rounded-lg overflow-hidden bg-background/50 mb-4">
                    <img 
                      src={request.transfer_image_url} 
                      alt="transfer image"
                      className="w-full h-auto max-h-80 object-contain"
                    />
                  </div>
                )}
                
                {/* delete button - available only for pending requests */}
                {request.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteRequest(request.id)}
                      disabled={deletingId === request.id}
                    >
                      {deletingId === request.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                      Delete request
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
