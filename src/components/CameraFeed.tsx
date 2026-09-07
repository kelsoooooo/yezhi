import { useEffect, useRef, useState } from 'react'
import { DEMO_VIDEO_PLAYLIST } from '../lib/game'

interface CameraFeedProps {
  demoMode: boolean
  paused?: boolean
  onReady?: (video: HTMLVideoElement) => void
  onError?: (message: string) => void
}

async function resolvePlaylist(): Promise<string[]> {
  const available: string[] = []
  for (const src of DEMO_VIDEO_PLAYLIST) {
    try {
      const res = await fetch(src, { method: 'HEAD' })
      if (res.ok) available.push(src)
    } catch {
      // skip
    }
  }
  return available.length ? available : DEMO_VIDEO_PLAYLIST.slice(0, 2)
}

export function CameraFeed({ demoMode, paused = false, onReady, onError }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const indexRef = useRef(0)
  const listRef = useRef<string[]>([])
  const [live, setLive] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !live) return
    if (paused) video.pause()
    else void video.play().catch(() => {})
  }, [paused, live])

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    const el = videoRef.current
    if (!el) return

    async function playDemoClip(video: HTMLVideoElement, index: number) {
      const list = listRef.current
      if (!list.length) throw new Error('empty playlist')
      const src = list[index % list.length]
      // Cross-origin demo clips need CORS so canvas capture (toDataURL) is allowed.
      if (/^https?:\/\//i.test(src)) video.crossOrigin = 'anonymous'
      else video.removeAttribute('crossorigin')
      video.src = src
      video.loop = list.length === 1
      video.muted = true
      video.playsInline = true
      await new Promise<void>((resolve, reject) => {
        video.addEventListener('loadeddata', () => resolve(), { once: true })
        video.addEventListener('error', () => reject(new Error('video error')), { once: true })
        video.load()
      })
      if (cancelled) return
      if (!paused) await video.play()
    }

    function onEnded() {
      if (!demoMode || cancelled || !videoRef.current || !listRef.current.length) return
      indexRef.current = (indexRef.current + 1) % listRef.current.length
      void playDemoClip(videoRef.current, indexRef.current).catch(() => {
        onError?.('Demo 影片播放中斷。')
      })
    }

    async function start(video: HTMLVideoElement) {
      setLive(false)
      const prev = video.srcObject as MediaStream | null
      prev?.getTracks().forEach((t) => t.stop())
      video.srcObject = null
      video.removeAttribute('src')
      video.load()
      video.removeEventListener('ended', onEnded)

      if (demoMode) {
        try {
          listRef.current = await resolvePlaylist()
          indexRef.current = 0
          video.addEventListener('ended', onEnded)
          await playDemoClip(video, 0)
          if (cancelled) return
          setLive(true)
          onReady?.(video)
        } catch {
          if (!cancelled) {
            setLive(false)
            onError?.('Demo 影片無法播放。請確認 /demo/clips 內有真實影片。')
          }
        }
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        if (cancelled) return
        video.removeAttribute('crossorigin')
        video.srcObject = stream
        video.loop = false
        await video.play()
        setLive(true)
        onReady?.(video)
      } catch {
        if (!cancelled) {
          setLive(false)
          onError?.('無法開啟鏡頭。請允許相機權限，或開啟 Demo 模式。')
        }
      }
    }

    void start(el)

    return () => {
      cancelled = true
      el.removeEventListener('ended', onEnded)
      stream?.getTracks().forEach((t) => t.stop())
    }
    // paused intentionally omitted from deps — handled by separate effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, onReady, onError])

  return (
    <div className={`camera-plane ${demoMode ? 'is-demo' : ''}`}>
      <video ref={videoRef} playsInline muted autoPlay crossOrigin={demoMode ? 'anonymous' : undefined} />
      {!live && <div className="fallback-grid" />}
    </div>
  )
}
