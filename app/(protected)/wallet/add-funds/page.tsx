"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Wallet, AlertCircle, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

const BUCKET_NAME = "wallet-transfer-slips"

function generateSafeFilename(file: File) {
  const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "")
  const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
  return extension ? `${uuid}.${extension}` : uuid
}

export default function WalletAddFundsPage() {
  const router = useRouter()
  const [amount, setAmount] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [transferImage, setTransferImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!amount.trim()) {
      setError("Please enter a valid top-up amount.")
      return
    }

    if (!accountNumber.trim()) {
      setError("Please enter an account number or transfer reference.")
      return
    }

    if (!transferImage) {
      setError("Transfer image is required to submit the request.")
      return
    }

    const amountValue = Number(amount)
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      setError("Enter a valid amount greater than zero.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("Unable to get user data. Please sign in again.")
      }

      // upload image to storage
      const safeFilename = generateSafeFilename(transferImage)
      const filePath = `${user.id}/${safeFilename}`
      
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, transferImage, { upsert: false })

      if (uploadError) throw uploadError

      // get public URL for the image
      const { data: publicUrl } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath)

      const imageUrl = publicUrl?.publicUrl || ""

      // insert recharge request with image URL and account number
      const { error: insertError } = await supabase.from("recharge_requests").insert({
        user_id: user.id,
        amount: amountValue,
        account_number: accountNumber,
        transfer_image_url: imageUrl,
        status: "pending",
      })

      if (insertError) throw insertError

      toast.success("Top-up request submitted successfully. Admin will review it shortly.")
      router.push("/wallet")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit request"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Card className="glass border-border/50 p-6 space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold">Add funds</h1>
          <p className="text-muted-foreground">
            Enter the amount you want to add and attach the transfer receipt. An admin will verify and top up your account.
          </p>
        </div>

          <div className="rounded-[32px] border border-primary/20 bg-primary/5 p-6 text-center">
          <p className="text-lg font-bold text-primary">Please transfer the amount to the following number:</p>
          <p className="mt-2 text-4xl font-extrabold text-emerald-600">01094919256</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount to top up</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount in EGP"
              min={1}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account number / transfer reference</Label>
            <Input
              id="accountNumber"
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter the account or reference you transferred from"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="transferImage">Transfer receipt image</Label>
              <div className="flex items-center gap-1 rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                <AlertCircle className="size-3" />
                Required
              </div>
            </div>
            <div className="relative">
              <Input
                id="transferImage"
                type="file"
                accept="image/*"
                onChange={(e) => setTransferImage(e.target.files?.[0] || null)}
                className="cursor-pointer"
                required
              />
              <Upload className="absolute right-3 top-2.5 size-5 text-muted-foreground pointer-events-none" />
            </div>
            {transferImage && (
              <div className="text-xs text-muted-foreground">
                ✓ Selected file: {transferImage.name}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" className="glow-primary" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
              Submit top-up request
            </Button>
            <Button asChild variant="outline">
              <Link href="/wallet">Back to wallet</Link>
            </Button>
          </div>
        </form>
      </Card>
      <Card className="glass border-border/50 p-6">
        <div className="grid gap-3">
          <div className="text-sm font-semibold text-foreground">Important notes:</div>
          <ul className="list-inside space-y-2 text-sm text-muted-foreground">
            <li>• Make sure the transfer image is clear and shows all details</li>
            <li>• The image must include the transfer reference and the amount</li>
            <li>• Admin will approve requests within 24 hours</li>
            <li>• After approval, the balance will be added automatically to your account</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
