import { useEffect } from 'react'

interface UnlockToastProps {
  title: string
  subtitle: string
  photoUrl?: string
  isNew: boolean
  onDone: () => void
}

export function UnlockToast({ title, subtitle, photoUrl, isNew, onDone }: UnlockToastProps) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 5200)
    return () => window.clearTimeout(t)
  }, [onDone])

  return (
    <div className="unlock-stage" role="status">
      <div className="unlock-backdrop" />
      <div className="unlock-particles" aria-hidden>
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className={`petal petal-${i + 1}`} />
        ))}
      </div>

      <div className={`unlock-card ${isNew ? 'is-new' : 'is-again'}`}>
        <div className="unlock-stamp">{isNew ? '新頁' : '再遇'}</div>
        {photoUrl && (
          <div className="unlock-photo">
            <img src={photoUrl} alt="" />
          </div>
        )}
        <p className="label">{isNew ? 'Codex unlocked' : 'Sighting logged'}</p>
        <strong>{title}</strong>
        <p className="unlock-sub">{subtitle}</p>
        <button type="button" className="btn" onClick={onDone}>
          收好這頁
        </button>
      </div>
    </div>
  )
}
