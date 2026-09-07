import type { GeoPoint, IdentifyResult } from '../types'

const IDENTIFY_TIMEOUT_MS = 55_000

export async function identifySpecies(
  imageBase64: string,
  mimeType: string,
  location: GeoPoint | null,
  timeoutMs = IDENTIFY_TIMEOUT_MS,
): Promise<IdentifyResult> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch('/api/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType, location }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `辨識失敗 (${res.status})`)
    }

    return res.json()
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('辨識逾時，請檢查網絡後再試一次')
    }
    throw err
  } finally {
    window.clearTimeout(timer)
  }
}

function isMobileCapture() {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1
}

export function captureFrame(
  video: HTMLVideoElement,
  maxWidth?: number,
): { dataUrl: string; mimeType: string } {
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error('鏡頭畫面尚未就緒，請稍候再試')
  }
  if (video.readyState < 2) {
    throw new Error('鏡頭仍在載入，請稍候再試')
  }

  const limit = maxWidth ?? (isMobileCapture() ? 720 : 960)
  const quality = isMobileCapture() ? 0.72 : 0.85
  const scale = Math.min(1, limit / video.videoWidth)
  const w = Math.max(1, Math.round(video.videoWidth * scale))
  const h = Math.max(1, Math.round(video.videoHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法擷取畫面')

  try {
    ctx.drawImage(video, 0, 0, w, h)
  } catch {
    throw new Error('無法擷取鏡頭畫面，請改用 Demo 模式或重新整理')
  }

  const mimeType = 'image/jpeg'
  let dataUrl: string
  try {
    dataUrl = canvas.toDataURL(mimeType, quality)
  } catch {
    throw new Error('無法輸出照片（可能是跨網域限制），請重新整理後再試')
  }

  if (!dataUrl || dataUrl.length < 32) {
    throw new Error('擷取到空白畫面，請再試一次')
  }

  return { dataUrl, mimeType }
}
