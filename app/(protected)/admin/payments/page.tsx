"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { CheckCircle2, XCircle, Loader2, Wallet, RefreshCw } from "lucide-react"
import { formatCurrency } from "@/lib/format"

interface RechargeRequest {
  id: string
  user_id: string
  amount: number
  account_number?: string
  transfer_image_url?: string
  status: string
  created_at: string
  users?: { full_name?: string }[]
}

export default function AdminPaymentsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<RechargeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  async function fetchRequests(supabase: ReturnType<typeof createClient>) {
    const { data, error } = await supabase
      .from("recharge_requests")
      .select("id, user_id, amount, account_number, transfer_image_url, status, created_at, users(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error) {
      toast.error("Failed to load requests")
      return []
    }
    return data || []
  }

  async function refreshRequests() {
    setRefreshing(true)
    const supabase = createClient()
    const updatedRequests = await fetchRequests(supabase)
    setRequests(updatedRequests)
    setRefreshing(false)
    toast.success("Requests list updated")
  }

  useEffect(() => {
    async function checkAdminAndFetch() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return router.push("/auth/login")

      const { data: userRow } = await supabase.from("users").select("role").eq("id", user.id).single()
      
      if (userRow?.role !== "admin") {
        toast.error("Sorry, this page is for admins only")
        return router.push("/dashboard")
      }

      setIsAdmin(true)
      
      const data = await fetchRequests(supabase)
      setRequests(data)
      setLoading(false)
    }
    checkAdminAndFetch()
  }, [router])

  async function handleAction(request: RechargeRequest, action: 'approved' | 'rejected') {
    setActionLoading(request.id)
    const supabase = createClient()
    let success = false

    try {
      // 1️⃣ update request status
      const { error: updateError } = await supabase
        .from("recharge_requests")
        .update({ status: action })
        .eq("id", request.id)

      if (updateError) throw updateError
      success = true

      // 2️⃣ if approved: try to add balance (don't block approval on failure)
      if (action === 'approved') {
        try {
          const { data: walletRow, error: walletSelectError } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", request.user_id)
            .maybeSingle()

          if (!walletSelectError) {
            if (walletRow) {
              await supabase
                .from("wallets")
                .update({ balance: (walletRow?.balance || 0) + request.amount })
                .eq("user_id", request.user_id)
            } else {
              await supabase
                .from("wallets")
                .insert({ user_id: request.user_id, balance: request.amount })
            }
          }

          if (request.transfer_image_url) {
            const extractFileName = (urlString: string) => {
              try {
                const url = new URL(urlString)
                const segments = url.pathname.split("/").filter(Boolean)
                const bucketIndex = segments.findIndex((segment) => segment === "wallet-transfer-slips")
                if (bucketIndex !== -1) {
                  return segments.slice(bucketIndex + 1).join("/")
                }
                return segments.join("/")
              } catch {
                return urlString.split("/").filter(Boolean).pop() ?? ""
              }
            }

            const fileName = extractFileName(request.transfer_image_url)
            if (fileName) {
              try {
                const { error: storageError } = await supabase
                  .storage
                  .from("wallet-transfer-slips")
                  .remove([fileName])

                if (storageError) {
                  // eslint-disable-next-line no-console
                  console.warn("Failed to remove transfer slip from storage", storageError)
                }
              } catch (storageErr) {
                // eslint-disable-next-line no-console
                console.warn("Storage removal failed for transfer slip", storageErr)
              }
            }

            const { error: clearUrlError } = await supabase
              .from("recharge_requests")
              .update({ transfer_image_url: null })
              .eq("id", request.id)

            if (clearUrlError) {
              // eslint-disable-next-line no-console
              console.warn("Failed to clear transfer_image_url after approval", clearUrlError)
            }
          }
        } catch (walletErr) {
          // ❌ log the error only, do not block request approval
          // eslint-disable-next-line no-console
          console.warn('Wallet update failed but request approved:', walletErr)
        }
      }

      const notificationMessage =
        action === 'approved'
          ? `Your top-up request of ${request.amount} EGP has been approved and added to your wallet.`
          : "Your top-up request has been rejected."

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: request.user_id,
            message: notificationMessage,
            is_read: false,
          },
        ])

      if (notificationError) {
        // eslint-disable-next-line no-console
        console.warn('Failed to create recharge notification', notificationError)
      }

      // ✅ show success toast and remove request from list
      toast.success(action === 'approved' ? "Approved and wallet topped up" : "Request rejected")
      setRequests(requests.filter((r) => r.id !== request.id))
    } catch (err) {
      // ❌ failed to update the request itself
      // eslint-disable-next-line no-console
      console.error('handleAction error:', err)
      const message = err instanceof Error ? err.message : err && typeof err === 'object' && 'message' in err ? (err as any).message : JSON.stringify(err)
      
      // show error only when the request wasn't updated
      if (!success) {
        toast.error(message || "An error occurred while processing the request")
      }
    } finally {
      setActionLoading(null)
    }
  }

  if (!isAdmin || loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto size-8" /></div>

  return (
    <div className="max-w-5xl space-y-8 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Wallet className="size-8 text-primary" />
          <div>
            <h1 className="text-3xl font-extrabold">Pending top-up requests</h1>
            <p className="text-muted-foreground">Review transfer receipts and confirm wallet top-ups for students.</p>
          </div>
        </div>
          <Button
          variant="outline"
          size="sm"
          onClick={refreshRequests}
          disabled={refreshing}
        >
          {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {requests.length === 0 ? (
          <Card className="glass p-10 text-center text-muted-foreground">No pending recharge requests at the moment.</Card>
        ) : (
          requests.map((req) => (
            <Card key={req.id} className="glass border-border/50 p-6">
              <div className="space-y-4">
                {/* student and amount info */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="font-bold text-xl">{req.users?.[0]?.full_name ?? "Student"}</div>
                    <div className="text-2xl font-black text-primary">{formatCurrency(req.amount)}</div>
                    {req.account_number && (
                      <div className="text-sm text-muted-foreground">Account number: {req.account_number}</div>
                    )}
                  </div>
                </div>

                {/* transfer image */}
                {req.transfer_image_url && (
                  <div className="border border-border/50 rounded-lg overflow-hidden bg-background/50">
                    <img 
                      src={req.transfer_image_url} 
                      alt="transfer image"
                      className="w-full h-auto max-h-96 object-contain"
                    />
                  </div>
                )}

                {/* approve / reject buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700" 
                    onClick={() => handleAction(req, 'approved')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === req.id ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="ml-2 size-4" />} Approve
                  </Button>
                  <Button variant="destructive" onClick={() => handleAction(req, 'rejected')} disabled={!!actionLoading}>
                    <XCircle className="ml-2 size-4" /> Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}