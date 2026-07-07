"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Upload, Film, Edit3, Trash2, Save, X } from "lucide-react"
import {
  CLOUDINARY_CHUNK_SIZE,
  loadUploadResumeState,
  removeUploadResumeState,
  type UploadResumeState,
  uploadVideoToCloudinary,
} from "@/lib/cloudinary"

interface CourseInfo {
  id: string
  title: string
}

interface LevelOption {
  value: string
  title: string
  level_number: number
  price: number | null
}

interface VideoItem {
  id: string
  title: string
  video_url: string
  order_index: number
  course_id: string
  level?: number
  courses?: { title: string }[]
}

const COURSE_ID = "01c2ad78-98fd-44cf-8e7a-9a6e195f4062"

export default function AdminVideosPage() {
  const [title, setTitle] = useState("")
  const [courseName, setCourseName] = useState("VORTEX")
  const [orderIndex, setOrderIndex] = useState("0")
  const [levelId, setLevelId] = useState("")
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [resumeState, setResumeState] = useState<UploadResumeState | null>(null)
  const [levels, setLevels] = useState<LevelOption[]>([])
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pageReady, setPageReady] = useState(false)
  const [showVideoList, setShowVideoList] = useState(false)
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editLevel, setEditLevel] = useState("")
  const [editOrderIndex, setEditOrderIndex] = useState("0")
  const [savingLevelId, setSavingLevelId] = useState<string | null>(null)

  const groupedVideos = useMemo(() => {
    const map = new Map<string, VideoItem[]>()
    levels.forEach((level) => map.set(level.value, []))
    videos.forEach((video) => {
      const levelKey = video.level != null ? String(video.level) : "unassigned"
      const bucket = map.get(levelKey) ?? []
      bucket.push(video)
      map.set(levelKey, bucket)
    })
    for (const level of levels) {
      const bucket = map.get(level.value) ?? []
      bucket.sort((a, b) => a.order_index - b.order_index)
      map.set(level.value, bucket)
    }
    return map
  }, [videos, levels])

  async function loadData() {
    try {
      const supabase = createClient()

      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id, title")
        .eq("id", COURSE_ID)
        .maybeSingle()

      if (courseError) {
        console.error("Failed to load course data", courseError)
        toast.error("Failed to load course data")
        return
      }

      setCourseName(courseData?.title || "VORTEX")

      const [{ data: levelsData, error: levelsError }, { data: videosData, error: videosError }] = await Promise.all([
        supabase
          .from("level_prices")
          .select("level_number, price")
          .order("level_number", { ascending: true }),
        supabase
          .from("videos")
          .select("id, title, video_url, order_index, course_id, level, courses(title)")
          .eq("course_id", COURSE_ID)
          .order("level", { ascending: true })
          .order("order_index", { ascending: true }),
      ])

      if (levelsError) {
        console.error("Failed to load levels", levelsError)
        setLevels([])
      } else {
        setLevels(
          (levelsData || []).map((item: any) => ({
            value: String(item.level_number),
            title: `Level ${item.level_number}`,
            level_number: item.level_number,
            price: Number(item.price ?? 0),
          })),
        )
        if ((levelsData?.length ?? 0) > 0) {
          setLevelId(String(levelsData[0].level_number))
        }
      }

      if (videosError) {
        console.error("Failed to load videos", videosError)
        setVideos([])
      } else {
        setVideos(videosData || [])
      }
    } catch (error) {
      console.error("Admin videos page load failed", error)
      toast.error("Unable to load admin videos page")
    }
  }

  useEffect(() => {
    const run = async () => {
      setPageReady(false)
      await loadData()
      setPageReady(true)
    }

    void run()
  }, [])

  async function handleVideoSelect(file: File | null) {
    setVideoFile(file)
    setVideoUrl("")
    setUploadError(null)
    setUploadProgress(0)
    setResumeState(null)

    if (!file) {
      return
    }

    const saved = loadUploadResumeState(file)
    if (saved) {
      setResumeState(saved)
    }
  }

  async function resetForm() {
    setTitle("")
    setVideoFile(null)
    setVideoUrl("")
    setOrderIndex("0")
    setLevelId(levels[0]?.value ?? "")
    setUploadError(null)
    setUploadProgress(0)
    setResumeState(null)
  }

  async function handleAdd() {
    if (!title.trim()) {
      return toast.error("Please enter a title")
    }

    if (!videoFile) {
      return toast.error("Please choose a video file")
    }

    if (!levelId) {
      return toast.error("Please choose a level")
    }

    setLoading(true)
    setBusy(true)
    setUploading(true)
    setUploadError(null)
    setUploadProgress(0)

    try {
      const result = await uploadVideoToCloudinary(videoFile, (progress) => {
        setUploadProgress(progress)
      }, resumeState ?? loadUploadResumeState(videoFile) ?? undefined)

      if (!result.secure_url) {
        throw new Error("Failed to obtain video URL from Cloudinary")
      }

      const videoUrl = result.secure_url
      const response = await fetch("/api/admin/videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          video_url: videoUrl,
          order_index: Number.isFinite(Number(orderIndex)) ? Number(orderIndex) : 0,
          level_number: Number(levelId),
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save video in the system")
      }

      toast.success("Video uploaded and saved")
      removeUploadResumeState(videoFile)
      await resetForm()
      await loadData()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload video"
      setUploadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
      setBusy(false)
      setUploading(false)
    }
  }

  const [selectedEditVideo, setSelectedEditVideo] = useState<VideoItem | null>(null)

  const handleEditClick = (video: VideoItem) => {
    setEditingVideoId(video.id)
    setSelectedEditVideo(video)
    setEditTitle(video.title)
    setEditLevel(video.level != null ? String(video.level) : levels[0]?.value ?? "")
    setEditOrderIndex(String(video.order_index ?? 0))
  }

  const handleCancelEdit = () => {
    setEditingVideoId(null)
    setSelectedEditVideo(null)
  }

  const handleSaveEdit = async () => {
    if (!editingVideoId || !selectedEditVideo) {
      return
    }

    const parsedOrder = Number(editOrderIndex)
    if (!Number.isFinite(parsedOrder) || parsedOrder < 0) {
      return toast.error("Please enter a valid order index")
    }

    setBusy(true)
    try {
      const { error } = await createClient()
        .from("videos")
        .update({
          title: editTitle.trim(),
          level: Number(editLevel),
          order_index: parsedOrder,
        })
        .eq("id", editingVideoId)

      if (error) {
        throw new Error(error.message)
      }

      toast.success("Video updated")
      await loadData()
      handleCancelEdit()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update video")
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteVideo = async (video: VideoItem) => {
    if (!confirm("Are you sure you want to delete this video?")) {
      return
    }

    setBusy(true)
    try {
      const response = await fetch(`/api/admin/videos?video_id=${encodeURIComponent(video.id)}`, {
        method: "DELETE",
        credentials: "include",
      })
      const body = await response.json()
      if (!response.ok) {
        throw new Error(body?.error || "Failed to delete video")
      }
      toast.success("Video deleted")
      setVideos((current) => current.filter((item) => item.id !== video.id))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete video")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      {!pageReady && (
        <Card className="glass border-border/50 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Loading admin videos</h1>
              <p className="text-sm text-muted-foreground">Preparing the page and loading your levels.</p>
            </div>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </Card>
      )}

      {pageReady && (
        <>
          <Card className="glass border-border/50 p-4 sm:p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Film className="size-6 text-primary" />
                <div>
                  <h1 className="text-2xl font-extrabold sm:text-3xl">Level Pricing</h1>
                  <p className="text-sm text-muted-foreground sm:text-base">Manage the purchase price for each level. Students buy a whole level and unlock all its videos.</p>
                </div>
              </div>

              <div className="grid gap-4">
                {levels.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No levels configured yet.</div>
                ) : (
                  levels.map((level) => (
                    <div key={level.value} className="rounded-2xl border border-border/50 bg-background p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">Level {level.level_number}</div>
                          <div className="font-semibold">{level.title}</div>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Input
                            id={`level-price-${level.value}`}
                            type="number"
                            min={0}
                            className="w-full sm:min-w-[140px]"
                            value={String(level.price ?? 0)}
                            onChange={(e) => {
                              const value = e.target.value
                              setLevels((current) =>
                                current.map((item) =>
                                  item.value === level.value ? { ...item, price: Number(value) } : item,
                                ),
                              )
                            }}
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={async () => {
                              setSavingLevelId(level.value)
                              try {
                                const parsedPrice = Number(level.price ?? 0)
                                if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
                                  throw new Error("Please enter a valid price")
                                }

                                const { error } = await createClient()
                                  .from("level_prices")
                                  .update({ price: parsedPrice })
                                  .eq("level_number", Number(level.value))

                                if (error) throw error
                                toast.success("Level price updated")
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Failed to update price")
                              } finally {
                                setSavingLevelId(null)
                              }
                            }}
                            disabled={savingLevelId === level.value}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          <Card className="glass border-border/50 p-4 sm:p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Film className="size-6 text-primary" />
                <div>
                  <h1 className="text-2xl font-extrabold sm:text-3xl">Upload new video</h1>
                  <p className="text-sm text-muted-foreground sm:text-base">Upload a video from your device — it will be saved to Cloudinary and then to Supabase.</p>
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="course">Course</Label>
                  <div className="rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-muted-foreground">
                    {courseName}
                  </div>
                </div>

                <div>
                  <Label htmlFor="title">Video title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div>
                  <Label htmlFor="level">Level</Label>
                  <select
                    id="level"
                    value={levelId}
                    onChange={(e) => setLevelId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none"
                  >
                    {levels.length === 0 ? (
                      <option value="">No levels</option>
                    ) : (
                      levels.map((level) => (
                        <option key={level.value} value={level.value}>
                          Level {level.level_number}: {level.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="orderIndex">Display order</Label>
                    <Input
                      id="orderIndex"
                      type="number"
                      value={orderIndex}
                      onChange={(e) => setOrderIndex(e.target.value)}
                      min={0}
                    />
                  </div>
                  <div>
                    <Label htmlFor="videoFile">Video file</Label>
                    <Input
                      id="videoFile"
                      type="file"
                      accept="video/*,.mp4,.mov,.m4v,.avi,.mkv,.webm,.3gp,.3g2"
                      onChange={(e) => handleVideoSelect(e.target.files?.[0] ?? null)}
                    />
                    {videoFile && (
                      <div className="mt-2 text-sm text-muted-foreground">Selected: {videoFile.name}</div>
                    )}
                    {uploading && <div className="mt-2 text-sm text-primary">Uploading video to Cloudinary...</div>}
                    {videoUrl && !uploading && (
                      <div className="mt-2 text-sm text-foreground">Uploaded: {videoUrl}</div>
                    )}
                    {uploadError && (
                      <div className="mt-2 text-sm text-destructive">Video upload error: {uploadError}</div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button onClick={handleAdd} disabled={loading || busy} className="w-full sm:w-auto">
                    {loading ? "Uploading video..." : "Upload video"}
                  </Button>
                  <Button variant="outline" disabled={busy} onClick={() => resetForm()} className="w-full sm:w-auto">
                    Clear form
                  </Button>
                  <Button variant="secondary" onClick={() => setShowVideoList((current) => !current)} className="w-full sm:w-auto">
                    {showVideoList ? "Hide videos" : "Show videos"}
                  </Button>
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <div className="text-sm text-primary">Uploading... {uploadProgress}%</div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}

                {!uploading && resumeState && videoFile && (
                  <div className="flex flex-wrap gap-2 items-center rounded-xl border border-yellow-400/40 bg-yellow-50 p-4 text-sm text-yellow-900">
                    <div>Uploaded {resumeState.nextChunk} chunk(s) / {Math.ceil(videoFile.size / CLOUDINARY_CHUNK_SIZE)}.</div>
                    <Button variant="outline" disabled={busy} onClick={handleAdd}>
                      Resume upload
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </>
      )}

      {pageReady && showVideoList && (
        <Card className="glass border-border/50 p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Upload className="size-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold sm:text-2xl">Uploaded videos</h2>
                <p className="text-sm text-muted-foreground sm:text-base">This is the list of videos currently in the system.</p>
              </div>
            </div>

            {videos.length === 0 ? (
              <div className="text-sm text-muted-foreground">No uploaded videos yet.</div>
            ) : (
              <div className="space-y-4">
                {levels.map((level) => {
                  const levelVideos = groupedVideos.get(level.value) ?? []
                  return (
                    <Card key={level.value} className="border-border/50 p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-lg font-semibold">{level.title}</div>
                            <div className="text-sm text-muted-foreground">{levelVideos.length} videos</div>
                          </div>
                        </div>

                        {levelVideos.length === 0 ? (
                          <div className="text-sm text-muted-foreground">No videos in this level yet.</div>
                        ) : (
                          <div className="grid gap-4">
                            {levelVideos.map((video) => {
                              const isEditing = editingVideoId === video.id
                              return (
                                <Card key={video.id} className="border-border/50 p-4">
                                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div className="flex-1 space-y-2">
                                      {isEditing ? (
                                        <div className="grid gap-3 sm:grid-cols-2">
                                          <div>
                                            <Label htmlFor="editTitle">Title</Label>
                                            <Input
                                              id="editTitle"
                                              value={editTitle}
                                              onChange={(e) => setEditTitle(e.target.value)}
                                            />
                                          </div>
                                          <div>
                                            <Label htmlFor="editLevel">Level</Label>
                                            <select
                                              id="editLevel"
                                              value={editLevel}
                                              onChange={(e) => setEditLevel(e.target.value)}
                                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none"
                                            >
                                              {levels.length === 0 ? (
                                                <option value="">No levels</option>
                                              ) : (
                                                levels.map((levelOption) => (
                                                  <option key={levelOption.value} value={levelOption.value}>
                                                    Level {levelOption.level_number}: {levelOption.title}
                                                  </option>
                                                ))
                                              )}
                                            </select>
                                          </div>
                                          <div>
                                            <Label htmlFor="editOrderIndex">Order</Label>
                                            <Input
                                              id="editOrderIndex"
                                              type="number"
                                              value={editOrderIndex}
                                              min={0}
                                              onChange={(e) => setEditOrderIndex(e.target.value)}
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="font-semibold text-lg">{video.title}</div>
                                          <div className="text-sm text-muted-foreground">
                                            Level: {levels.find((item) => item.value === String(video.level))?.title ?? "Unknown"}
                                          </div>
                                          <div className="text-sm text-muted-foreground">Order: {video.order_index}</div>
                                        </>
                                      )}
                                    </div>

                                    <div className="flex flex-col gap-2 items-start md:items-end">
                                      {isEditing ? (
                                        <div className="flex flex-wrap gap-2">
                                          <Button size="sm" variant="default" onClick={handleSaveEdit} disabled={busy}>
                                            <Save className="size-4" /> Save
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={busy}>
                                            <X className="size-4" /> Cancel
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap gap-2">
                                          <Button size="sm" variant="outline" onClick={() => handleEditClick(video)} disabled={busy}>
                                            <Edit3 className="size-4" /> Edit
                                          </Button>
                                          <Button size="sm" variant="destructive" onClick={() => handleDeleteVideo(video)} disabled={busy}>
                                            <Trash2 className="size-4" /> Delete
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </Card>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
