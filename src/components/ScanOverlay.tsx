interface ScanOverlayProps {
  phase: 'idle' | 'flash' | 'loading'
  tip: string
  photoUrl?: string
  mirrorPhoto?: boolean
}

export function ScanOverlay({ phase, tip, photoUrl, mirrorPhoto = false }: ScanOverlayProps) {
  if (phase === 'idle') return null

  return (
    <div className={`scan-fx ${phase}`} aria-live="polite" aria-busy={phase === 'loading'}>
      {phase === 'flash' && <div className="shutter-flash" />}

      {phase === 'loading' && (
        <div className="scan-loading fullscreen">
          {photoUrl ? (
            <div className={`loading-photo-bg ${mirrorPhoto ? 'mirror' : ''}`}>
              <img src={photoUrl} alt="剛拍下的畫面" />
              <div className="loading-photo-veil" aria-hidden />
            </div>
          ) : (
            <div className="loading-wash" aria-hidden />
          )}

          <div className="loading-core">
            <div className="loading-orb">
              <span className="orb-ring" />
              <span className="orb-ring delay" />
              <svg className="orb-leaf" viewBox="0 0 64 64" fill="none" aria-hidden>
                <path
                  d="M32 8c12 8 20 20 20 32 0 12-8 20-20 20S12 52 12 40C12 28 20 16 32 8Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M32 16v32M32 24c7 3 12 9 14 16M32 30c-6 3-10 8-12 13"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  opacity=".55"
                />
              </svg>
            </div>
            <p className="loading-kicker">Observing</p>
            <h3>正在寫下這一刻</h3>
            <p className="loading-tip">{tip}</p>
            <div className="loading-bar" aria-hidden>
              <i />
            </div>
            <div className="loading-dots" aria-hidden>
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
