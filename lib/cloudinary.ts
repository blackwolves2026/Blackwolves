// Cloudinary unsigned upload helper (frontend-safe)
// Uses cloud name + unsigned preset only. NEVER use API secret in the browser.

const DEFAULT_CLOUDINARY_CLOUD_NAME = "debg9gmh7"
const DEFAULT_CLOUDINARY_UPLOAD_PRESET = "vortex_upload"

function normalizeCloudName(value: string | undefined) {
  const trimmed = value?.trim() || ""
  return /^[a-z0-9_]+$/i.test(trimmed) ? trimmed : undefined
}

function normalizeUploadPreset(value: string | undefined) {
  const trimmed = value?.trim() || ""
  return /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : undefined
}

export const CLOUDINARY_CLOUD_NAME =
  normalizeCloudName(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) ||
  DEFAULT_CLOUDINARY_CLOUD_NAME
export const CLOUDINARY_UPLOAD_PRESET =
  normalizeUploadPreset(process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) ||
  DEFAULT_CLOUDINARY_UPLOAD_PRESET
export const CLOUDINARY_VIDEO_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`
export const CLOUDINARY_CHUNK_SIZE = 10 * 1024 * 1024
const UPLOAD_RESUME_PREFIX = "vortex_video_upload_resume_"

export type CloudinaryUploadResult = {
  secure_url: string
  public_id: string
  duration?: number
  bytes: number
  format: string
  upload_id?: string
}

export type UploadResumeState = {
  fileName: string
  fileSize: number
  uploadId?: string
  nextChunk: number
}

export function getUploadResumeKey(file: File) {
  return `${UPLOAD_RESUME_PREFIX}${file.name}`
}

export function loadUploadResumeState(file: File): UploadResumeState | null {
  try {
    const stored = localStorage.getItem(getUploadResumeKey(file))
    if (!stored) return null
    const state = JSON.parse(stored) as UploadResumeState
    if (state.fileName !== file.name || state.fileSize !== file.size) return null
    return state
  } catch {
    return null
  }
}

export function saveUploadResumeState(state: UploadResumeState) {
  try {
    localStorage.setItem(`${UPLOAD_RESUME_PREFIX}${state.fileName}`, JSON.stringify(state))
  } catch {
    // ignore localStorage errors
  }
}

export function removeUploadResumeState(file: File) {
  try {
    localStorage.removeItem(getUploadResumeKey(file))
  } catch {
    // ignore localStorage errors
  }
}

export async function uploadVideoToCloudinary(
  file: File,
  onProgress?: (pct: number) => void,
  resumeState?: UploadResumeState,
): Promise<CloudinaryUploadResult> {
  const totalChunks = Math.ceil(file.size / CLOUDINARY_CHUNK_SIZE)
  let uploadId = resumeState?.uploadId
  let currentChunk = resumeState?.nextChunk ?? 0

  while (currentChunk < totalChunks) {
    const start = currentChunk * CLOUDINARY_CHUNK_SIZE
    const end = Math.min(start + CLOUDINARY_CHUNK_SIZE, file.size)
    const chunk = file.slice(start, end)
    const formData = new FormData()
    formData.append("file", chunk)
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)
    formData.append("chunk_size", String(CLOUDINARY_CHUNK_SIZE))
    formData.append("chunk_number", String(currentChunk + 1))
    formData.append("filename", file.name)
    if (file.type) {
      formData.append("content_type", file.type)
    }
    if (uploadId) {
      formData.append("upload_id", uploadId)
    }

    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", CLOUDINARY_VIDEO_UPLOAD_URL)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const baseProgress = (currentChunk * CLOUDINARY_CHUNK_SIZE) / file.size
          const chunkProgress = event.loaded / event.total
          const percentage = Math.min(100, Math.round((baseProgress + chunkProgress / totalChunks) * 100))
          onProgress(percentage)
        }
      }

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(res)
          } else {
            reject(new Error(res?.error?.message || `Upload failed with status ${xhr.status}`))
          }
        } catch (error) {
          reject(error)
        }
      }

      xhr.onerror = () => reject(new Error("Network error during Cloudinary upload"))
      xhr.send(formData)
    })

    uploadId = result.upload_id ?? uploadId
    const nextChunk = currentChunk + 1
    saveUploadResumeState({
      fileName: file.name,
      fileSize: file.size,
      uploadId,
      nextChunk,
    })

    if (nextChunk >= totalChunks) {
      removeUploadResumeState(file)
      if (!result.secure_url) {
        throw new Error("Cloudinary did not return a secure URL after the final chunk")
      }
      return result
    }

    currentChunk = nextChunk
  }

  throw new Error("Unexpected upload state")
}
