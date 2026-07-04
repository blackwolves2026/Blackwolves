"use client"

import { useEffect, useState } from "react"
import { Bell, Loader2, Trash2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface NotificationItem {
  id: string
  message: string
  is_read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingAll, setDeletingAll] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    async function loadNotifications() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) {
        if (mounted) setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("id, message, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (mounted) {
        if (error) {
          console.error("Notifications load error:", error)
        } else if (!data || data.length === 0) {
          console.debug("Notifications query returned no rows for user:", user.id)
        }
        setItems(error ? [] : data ?? [])
        setLoading(false)
      }
    }

    void loadNotifications()

    const channel = supabase.channel("notifications-page")
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
      },
      () => {
        void loadNotifications()
      },
    )
    channel.subscribe()

    return () => {
      mounted = false
      supabase.removeAllChannels()
    }
  }, [])

  async function markAllAsRead() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return

    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id)
    if (error) {
      toast.error("Unable to mark all notifications as read")
      return
    }

    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    toast.success("All notifications marked as read")
  }

  async function deleteAll() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return

    setDeletingAll(true)
    const { error } = await supabase.from("notifications").delete().eq("user_id", user.id)
    setDeletingAll(false)

    if (error) {
      toast.error("Unable to delete notifications")
      return
    }

    setItems([])
    toast.success("All notifications deleted")
  }

  async function deleteOne(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from("notifications").delete().eq("id", id)
    if (error) {
      toast.error("Unable to delete the notification")
      return
    }

    setItems((prev) => prev.filter((n) => n.id !== id))
    toast.success("Notification deleted")
  }

  async function markOneAsRead(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id)
    if (error) {
      toast.error("Unable to mark notification as read")
      return
    }

    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Card className="glass border-border/50 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold">Notifications</h1>
            <p className="text-muted-foreground">All notifications for your account appear here.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
            <Button variant="destructive" size="sm" onClick={deleteAll} disabled={deletingAll}>
              {deletingAll ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete all
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <Card className="glass border-border/50 p-10 text-center text-muted-foreground">
            <Loader2 className="mx-auto size-6 animate-spin" />
            <div className="mt-3">Loading notifications...</div>
          </Card>
        ) : items.length === 0 ? (
          <Card className="glass border-border/50 p-10 text-center text-muted-foreground">
            <Bell className="mx-auto size-8" />
            <div className="mt-3">No notifications at the moment.</div>
          </Card>
        ) : (
          items.map((n) => (
            <Card key={n.id} className="glass border-border/50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{n.is_read ? "Read" : "New"}</span>
                    {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{n.message}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("en-US")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!n.is_read && (
                    <Button variant="outline" size="sm" onClick={() => void markOneAsRead(n.id)}>
                      Mark read
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => void deleteOne(n.id)}>
                    <Trash2 className="size-4" />
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
