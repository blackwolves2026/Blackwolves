"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import { useWallet } from "@/lib/wallet-context"
import { Lock, Play } from "lucide-react"
import { toast } from "sonner"

export interface CourseVideoItem {
  id: string
  title: string
  order_index: number
  level: string | number | null
  price?: number | null
}

interface CourseVideoSectionProps {
  videos?: CourseVideoItem[]
  purchasedVideoIds?: string[]
}

const LEVELS = [
  { level: "1", title: "Level 1" },
  { level: "2", title: "Level 2" },
  { level: "3", title: "Level 3" },
  { level: "4", title: "Level 4" },
]

export default function CourseVideoSection({ videos = [], purchasedVideoIds: purchasedVideoIdsInitially = [] }: CourseVideoSectionProps) {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [purchasedVideoIds, setPurchasedVideoIds] = useState<string[]>(purchasedVideoIdsInitially)
  const [videoError, setVideoError] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (selectedVideoId && !purchasedVideoIds.includes(selectedVideoId)) {
      setSelectedVideoId(null)
    }
  }, [purchasedVideoIds, selectedVideoId])

  const groupedVideos = useMemo(() => {
    const map = new Map<string, CourseVideoItem[]>()
    videos.forEach((video) => {
      const levelKey = video.level !== null && video.level !== undefined ? String(video.level) : "1"
      const bucket = map.get(levelKey) ?? []
      bucket.push(video)
      map.set(levelKey, bucket)
    })
    for (const level of LEVELS) {
      const bucket = map.get(level.level) ?? []
      bucket.sort((a, b) => a.order_index - b.order_index)
      map.set(level.level, bucket)
    }
    return map
  }, [videos])

  const { updateWallet } = useWallet()

  const selectedVideo = useMemo(() => {
    if (!selectedVideoId) return null
    return videos.find((video) => video.id === selectedVideoId) ?? null
  }, [selectedVideoId, videos])

  const handleSelectVideo = (videoId: string) => {
    if (!purchasedVideoIds.includes(videoId)) return
    setSelectedVideoId(videoId)
    setVideoError(false)
  }

  const handlePurchase = async (videoId: string) => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/purchases", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ video_id: videoId }),
        })

        const body = await response.json()
        if (!response.ok) {
          throw new Error(body?.error || "Purchase failed")
        }

        toast.success("Purchase completed successfully")
        const purchasedVideo = videos.find((video) => video.id === videoId)
        if (purchasedVideo) {
          const amount = Number(purchasedVideo.price ?? 0)
          updateWallet((current) => current - amount)
        }
        setPurchasedVideoIds((current) => (current.includes(videoId) ? current : [...current, videoId]))
        setSelectedVideoId(videoId)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Purchase failed"
        toast.error(message)
      }
    })
  }

  const streamUrl = selectedVideo ? `/api/videos/stream?video_id=${selectedVideo.id}` : null

  return (
    <div className="space-y-6">
      <Card className="glass border-border/50 p-6">
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">Video player</div>
          {purchasedVideoIds.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/70 bg-muted/40 p-10 text-center text-muted-foreground">
              All videos are locked until you purchase the required content.
              <div className="mt-2 text-sm text-muted-foreground">Click purchase on a video to unlock playback.</div>
            </div>
          ) : selectedVideo ? (
            videoError ? (
              <div className="rounded-3xl border border-dashed border-border/70 bg-muted/40 p-10 text-center text-muted-foreground">
                Unable to play the video right now. Please try again or check your internet connection.
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-3xl bg-black">
                <video
                  controls
                  controlsList="nodownload"
                  playsInline
                  onContextMenu={(event) => event.preventDefault()}
                  onError={() => setVideoError(true)}
                  className="aspect-video w-full bg-black"
                  preload="metadata"
                >
                  <source src={streamUrl ?? undefined} type="video/mp4" />
                  <p className="text-sm text-muted-foreground">Your browser does not support video playback.</p>
                </video>
              </div>
            )
          ) : (
            <div className="rounded-3xl border border-dashed border-border/70 bg-muted/40 p-10 text-center text-muted-foreground">
              Select a video to play after purchase
            </div>
          )}
        </div>
      </Card>

      {LEVELS.map((level) => {
        const levelVideos = groupedVideos.get(level.level) ?? []
        return (
          <Card key={level.level} className="glass border-border/50 p-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Level</div>
                  <div className="text-2xl font-bold">{level.title}</div>
                </div>
                <div className="text-sm text-muted-foreground">{levelVideos.length} videos</div>
              </div>

              {levelVideos.length > 0 ? (
                <div className="grid gap-4">
                  {levelVideos.map((video) => {
                    const isLocked = !purchasedVideoIds.includes(video.id)
                    const isActive = selectedVideoId === video.id
                    return (
                      <Card key={video.id} className={`border-border/50 p-4 ${isActive ? "ring-2 ring-primary" : ""}`}>
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="font-semibold text-lg">{video.title}</div>
                            <div className="text-sm text-muted-foreground">Display order: {video.order_index}</div>
                            <div className="text-sm text-muted-foreground">
                              Video price: {formatCurrency(video.price ?? 0)}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            {isLocked ? (
                              <>
                                <div className="flex items-center gap-2 text-sm text-destructive">
                                  <Lock className="size-4" /> Locked
                                </div>
                                <Button
                                  variant="outline"
                                  onClick={() => handlePurchase(video.id)}
                                  disabled={isPending}
                                >
                                  Purchase {formatCurrency(video.price ?? 0)}
                                </Button>
                              </>
                            ) : (
                              <Button variant={isActive ? "default" : "outline"} onClick={() => handleSelectVideo(video.id)}>
                                <Play className="size-4" /> {isActive ? "Playing now" : "Play"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No videos available in this level yet.</div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
