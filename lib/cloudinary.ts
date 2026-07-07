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

function inferMimeType(fileName: string) {
  const normalized = fileName.toLowerCase()

  if (normalized.endsWith(".mp4")) return "video/mp4"
  if (normalized.endsWith(".mov") || normalized.endsWith(".qt")) return "video/quicktime"
  if (normalized.endsWith(".m4v")) return "video/x-m4v"
  if (normalized.endsWith(".webm")) return "video/webm"
  if (normalized.endsWith(".avi")) return "video/x-msvideo"
  if (normalized.endsWith(".mkv")) return "video/x-matroska"
  if (normalized.endsWith(".3gp")) return "video/3gpp"
  if (normalized.endsWith(".3g2")) return "video/3gpp2"

  return ""
}

export async function uploadVideoToCloudinary(
  file: File,
  onProgress?: (pct: number) => void,
  _resumeState?: UploadResumeState,
): Promise<CloudinaryUploadResult> {
  const formData = new FormData()
  const inferredMimeType = inferMimeType(file.name)
  const contentType = file.type || inferredMimeType || "video/mp4"

  formData.append("file", file)
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)
  formData.append("resource_type", "video")
  formData.append("filename", file.name)
  formData.append("content_type", contentType)

  const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", CLOUDINARY_VIDEO_UPLOAD_URL)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentage = Math.min(100, Math.round((event.loaded / event.total) * 100))
        onProgress(percentage)
      }
    }

    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) {
          if (!res?.secure_url) {
            reject(new Error(res?.error?.message || "Cloudinary did not return a secure URL"))
            return
          }
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

  removeUploadResumeState(file)

  if (!result.secure_url) {
    throw new Error("Cloudinary did not return a secure URL")
  }

  return result
}
