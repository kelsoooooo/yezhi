import type { GeoPoint, IdentifyResult } from '../types'

export async function identifySpecies(
  imageBase64: string,
  mimeType: string,
  location: GeoPoint | null,
): Promise<IdentifyResult> {
  const res = await fetch('/api/identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType, location }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `辨識失敗 (${res.status})`)
  }

  return res.json()
}

export function captureFrame(
  video: HTMLVideoElement,
  maxWidth = 960,
): { dataUrl: string; mimeType: string } {
  const scale = Math.min(1, maxWidth / video.videoWidth)
  const w = Math.max(1, Math.round(video.videoWidth * scale))
  const h = Math.max(1, Math.round(video.videoHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法擷取畫面')
  ctx.drawImage(video, 0, 0, w, h)
  const mimeType = 'image/jpeg'
  return { dataUrl: canvas.toDataURL(mimeType, 0.85), mimeType }
}
