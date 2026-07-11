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
  level: number | null
}

export interface LevelInfo {
  id: string
  title: string
  level_number: number
  price: number | null
}

interface CourseVideoSectionProps {
  videos?: CourseVideoItem[]
  levels?: LevelInfo[]
  purchasedLevelIds?: string[]
}

const QUALITY_OPTIONS = [
  { label: "Auto", value: "Auto" },
  { label: "360p", value: "360p" },
  { label: "480p", value: "480p" },
  { label: "720p", value: "720p" },
  { label: "1080p", value: "1080p" },
] as const

export default function CourseVideoSection({
  videos = [],
  levels = [],
  purchasedLevelIds: purchasedLevelIdsInitially = [],
}: CourseVideoSectionProps) {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [purchasedLevelIds, setPurchasedLevelIds] = useState<string[]>(purchasedLevelIdsInitially)
  const [videoError, setVideoError] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [videoQuality, setVideoQuality] = useState<(typeof QUALITY_OPTIONS)[number]["value"]>("Auto")

  useEffect(() => {
    if (selectedVideoId) {
      const selectedVideo = videos.find((video) => video.id === selectedVideoId)
      if (!selectedVideo || selectedVideo.level == null || !purchasedLevelIds.includes(String(selectedVideo.level))) {
        setSelectedVideoId(null)
      }
    }
  }, [purchasedLevelIds, selectedVideoId, videos])

  const groupedVideos = useMemo(() => {
    const map = new Map<string, CourseVideoItem[]>()
    videos.forEach((video) => {
      const levelKey = video.level != null ? String(video.level) : "unassigned"
      const bucket = map.get(levelKey) ?? []
      bucket.push(video)
      map.set(levelKey, bucket)
    })
    return map
  }, [videos])

  const { wallet, updateWallet } = useWallet()

  const selectedVideo = useMemo(() => {
    if (!selectedVideoId) return null
    return videos.find((video) => video.id === selectedVideoId) ?? null
  }, [selectedVideoId, videos])

  const handleSelectVideo = (videoId: string) => {
    const selectedVideo = videos.find((video) => video.id === videoId)
    if (!selectedVideo || selectedVideo.level == null || !purchasedLevelIds.includes(String(selectedVideo.level))) return
    setSelectedVideoId(videoId)
    setVideoError(false)
  }

  const handlePurchaseLevel = async (levelId: string, price: number) => {
    startTransition(async () => {
      try {
        if (wallet < price) {
          toast.error("Insufficient balance. Please top up your wallet first.")
          return
        }

        const response = await fetch("/api/purchases", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ level_number: Number(levelId) }),
        })

        const body = await response.json()
        if (!response.ok) {
          throw new Error(body?.error || "Purchase failed")
        }

        toast.success("Level purchased successfully")
        updateWallet((current) => current - price)
        setPurchasedLevelIds((current) => (current.includes(levelId) ? current : [...current, levelId]))
      } catch (error) {
        const message = error instanceof Error ? error.message : "Purchase failed"
        toast.error(message)
      }
    })
  }

  const streamUrl = useMemo(() => {
    if (!selectedVideo) return null
    return `/api/videos/stream?video_id=${selectedVideo.id}&quality=${encodeURIComponent(videoQuality)}`
  }, [selectedVideo, videoQuality])

  return (
    <div className="space-y-6">
      <Card className="glass border-border/50 p-6">
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">Video player</div>
          {purchasedLevelIds.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/70 bg-muted/40 p-10 text-center text-muted-foreground">
              All videos are locked until you purchase the corresponding level.
              <div className="mt-2 text-sm text-muted-foreground">Purchase a level to unlock all videos in that section.</div>
            </div>
          ) : selectedVideo ? (
            videoError ? (
              <div className="rounded-3xl border border-dashed border-border/70 bg-muted/40 p-10 text-center text-muted-foreground">
                Unable to play the video right now. Please try again or check your internet connection.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Quality:</span>
                  {QUALITY_OPTIONS.map((option) => {
                    const isActive = videoQuality === option.value
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        size="sm"
                        variant={isActive ? "default" : "outline"}
                        className="min-w-20"
                        onClick={() => setVideoQuality(option.value)}
                      >
                        {option.label}
                      </Button>
                    )
                  })}
                </div>
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
              </div>
            )
          ) : (
            <div className="rounded-3xl border border-dashed border-border/70 bg-muted/40 p-10 text-center text-muted-foreground">
              Select a video to play after purchasing its level.
            </div>
          )}
        </div>
      </Card>

      {levels.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/70 bg-muted/40 p-10 text-center text-muted-foreground">
          No levels available yet.
        </div>
      ) : (
        levels.map((level) => {
          const levelVideos = groupedVideos.get(level.id) ?? []
          const isPurchased = purchasedLevelIds.includes(level.id)
          return (
            <Card key={level.id} className="glass border-border/50 p-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Level {level.level_order}</div>
                    <div className="text-2xl font-bold">{level.title}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-sm text-muted-foreground">{levelVideos.length} videos</div>
                    {isPurchased ? (
                      <div className="rounded-full border border-emerald-500 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-700">
                        Unlocked
                      </div>
                    ) : (
                      <Button onClick={() => handlePurchaseLevel(level.id, Number(level.price ?? 0))} disabled={isPending}>
                        Purchase {formatCurrency(level.price ?? 0)}
                      </Button>
                    )}
                  </div>
                </div>

                {levelVideos.length > 0 ? (
                  <div className="grid gap-4">
                    {levelVideos.map((video) => {
                      const isLocked = !isPurchased
                      const isActive = selectedVideoId === video.id
                      return (
                        <Card key={video.id} className={`border-border/50 p-4 ${isActive ? "ring-2 ring-primary" : ""}`}>
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="font-semibold text-lg">{video.title}</div>
                              <div className="text-sm text-muted-foreground">Display order: {video.order_index}</div>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              {isLocked ? (
                                <div className="flex items-center gap-2 text-sm text-destructive">
                                  <Lock className="size-4" /> Locked until level purchase
                                </div>
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
        })
      )}
    </div>
  )
}
