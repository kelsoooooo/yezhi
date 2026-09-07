import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CameraFeed } from './components/CameraFeed'
import { CodexPanel } from './components/CodexPanel'
import { DemoDock } from './components/DemoDock'
import { MapPanel } from './components/MapPanel'
import { ResultSheet } from './components/ResultSheet'
import { ScanOverlay } from './components/ScanOverlay'
import { UnlockToast } from './components/UnlockToast'
import { captureFrame, identifySpecies } from './lib/api'
import {
  codexList,
  clearState,
  DEMO_MODE_KEY,
  loadState,
  registerDiscovery,
  resetWithDemoData,
  speciesId,
  xpForLevel,
} from './lib/game'
import type {
  AppView,
  CodexEntry,
  GeoPoint,
  IdentifyResult,
  PlayerState,
  SpeciesCandidate,
} from './types'

const LOADING_TIPS = [
  '輕輕描出輪廓……',
  '查閱野外手記……',
  '為這一刻命名……',
]

type ScanPhase = 'idle' | 'flash' | 'loading'
type ToastState = {
  title: string
  subtitle: string
  photoUrl?: string
  isNew: boolean
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [view, setView] = useState<AppView>('scanner')
  const [player, setPlayer] = useState<PlayerState>(() => loadState())
  const [scanning, setScanning] = useState(false)
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle')
  const [loadingTip, setLoadingTip] = useState(LOADING_TIPS[0])
  const [shutterBump, setShutterBump] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [result, setResult] = useState<IdentifyResult | null>(null)
  const [resultEnter, setResultEnter] = useState(false)
  const [selected, setSelected] = useState<SpeciesCandidate | null>(null)
  const [lastPhoto, setLastPhoto] = useState<string | undefined>()
  const [location, setLocation] = useState<GeoPoint | null>(null)
  const [mapFocus, setMapFocus] = useState<GeoPoint | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const [status, setStatus] = useState('準備就緒 · 輕輕對準一株草木或一隻小蟲')
  const [codexBurst, setCodexBurst] = useState(false)
  const [demoMode, setDemoMode] = useState(() => {
    try {
      return localStorage.getItem(DEMO_MODE_KEY) === '1'
    } catch {
      return false
    }
  })

  const entries = useMemo(() => codexList(player), [player])

  const onReady = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video
    setCameraError(null)
    setStatus('鏡頭已開啟 · 可以開始觀察')
  }, [])

  const onCamError = useCallback((message: string) => {
    setCameraError(message)
    setStatus(message)
  }, [])

  function persistDemoMode(next: boolean) {
    setDemoMode(next)
    try {
      localStorage.setItem(DEMO_MODE_KEY, next ? '1' : '0')
    } catch {
      // ignore
    }
  }

  function handleToggleDemo() {
    const next = !demoMode
    persistDemoMode(next)
    setCameraError(null)
    setStatus('鏡頭已開啟 · 可以開始觀察')
  }

  function handleSeedDemo() {
    const next = resetWithDemoData()
    setPlayer(next)
    setCodexBurst(true)
    setStatus(`已載入示範圖鑑 · ${next.unlocks} 種`)
    window.setTimeout(() => setCodexBurst(false), 1200)
  }

  function handleClearCodex() {
    const next = clearState()
    setPlayer(next)
    setStatus('圖鑑已清空')
  }

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 60_000 },
    )
  }, [])

  useEffect(() => {
    if (scanPhase !== 'loading') return
    let i = 0
    setLoadingTip(LOADING_TIPS[0])
    const id = window.setInterval(() => {
      i = (i + 1) % LOADING_TIPS.length
      setLoadingTip(LOADING_TIPS[i])
    }, 1400)
    return () => window.clearInterval(id)
  }, [scanPhase])

  const xpFloor = xpForLevel(player.level)
  const xpCeil = xpForLevel(player.level + 1)
  const xpPct = Math.min(100, Math.round(((player.xp - xpFloor) / Math.max(1, xpCeil - xpFloor)) * 100))

  async function handleScan() {
    if (scanning) return
    const video = videoRef.current
    if (!video || !video.videoWidth) {
      setStatus('鏡頭尚未就緒')
      return
    }

    setScanning(true)
    setResult(null)
    setSelected(null)
    setShutterBump(true)
    setScanPhase('flash')
    setStatus('快門……')

    try {
      const frame = captureFrame(video)
      setLastPhoto(frame.dataUrl)

      await new Promise((r) => setTimeout(r, 280))
      setScanPhase('loading')
      setStatus('正在辨認……')

      const data = await identifySpecies(frame.dataUrl, frame.mimeType, location)
      setResult(data)
      setSelected(data.candidates[0] || null)
      setResultEnter(true)
      setStatus(
        data.detected
          ? `找到 ${data.candidates.length} 個可能物種`
          : '這次沒有辨認出明確物種',
      )
      window.setTimeout(() => setResultEnter(false), 700)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : '辨認失敗')
    } finally {
      setScanPhase('idle')
      setScanning(false)
      setShutterBump(false)
    }
  }

  function handleUnlock() {
    if (!result || !selected || unlocking) return
    setUnlocking(true)

    window.setTimeout(() => {
      const outcome = registerDiscovery(player, result, selected, lastPhoto, location)
      setPlayer(outcome.state)
      const parts = [`+${outcome.gainedXp} 經驗`]
      if (outcome.leveledUp) parts.push(`升至 ${outcome.state.level} 級`)

      setResult(null)
      setToast({
        title: outcome.unlocked
          ? `寫入圖鑑：${outcome.entry.candidate.commonNameZh}`
          : `再次遇見：${outcome.entry.candidate.commonNameZh}`,
        subtitle: parts.join(' · '),
        photoUrl: lastPhoto || outcome.entry.photoDataUrl,
        isNew: outcome.unlocked,
      })
      setCodexBurst(true)
      setUnlocking(false)
      window.setTimeout(() => setCodexBurst(false), 1200)
    }, 420)
  }

  function openCodexEntry(entry: CodexEntry) {
    setView('codex')
    setResult({
      detected: true,
      category: entry.category,
      candidates: [entry.candidate],
      scanNotes: `圖鑑紀錄 · 已觀察 ${entry.sightings} 次`,
    })
    setSelected(entry.candidate)
    setLastPhoto(entry.photoDataUrl)
    setResultEnter(true)
    window.setTimeout(() => setResultEnter(false), 700)
  }

  const alreadyNote =
    selected && player.codex[speciesId(selected)]
      ? `已在圖鑑中（觀察 ${player.codex[speciesId(selected)].sightings} 次）· 再次登錄仍可累積經驗`
      : undefined

  return (
    <div className={`app-shell view-${view} ${demoMode ? 'demo-on' : ''}`}>
      <CameraFeed
        demoMode={demoMode}
        paused={scanPhase === 'loading' || scanPhase === 'flash'}
        onReady={onReady}
        onError={onCamError}
      />

      <div className="hud-layer">
        <header className="top-bar">
          <div className="brand-block">
            <div className="brand">
              野<span>誌</span>
            </div>
            <div className="brand-sub">香港野外觀察手記</div>
          </div>
          <div className="stat-chips">
            <div className="chip">
              等級<strong>{player.level}</strong>
              <div className="xp-track">
                <i style={{ width: `${xpPct}%` }} />
              </div>
            </div>
            <div className="chip">
              經驗<strong>{player.xp}</strong>
            </div>
            <div className={`chip ${codexBurst ? 'chip-burst' : ''}`}>
              圖鑑<strong>{player.unlocks}</strong>
            </div>
          </div>
        </header>

        <nav className="view-tabs" aria-label="主選單">
          {(
            [
              ['scanner', '觀察'],
              ['codex', '圖鑑'],
              ['map', '地圖'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`tab ${view === id ? 'active' : ''}`}
              onClick={() => {
                setView(id)
                if (id !== 'codex') setResult(null)
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <DemoDock
          demoMode={demoMode}
          onToggleDemo={handleToggleDemo}
          onSeedDemo={handleSeedDemo}
          onClear={handleClearCodex}
        />

        <main className="main-stage">
          {view === 'scanner' && (
            <>
              <div className={`scan-frame ${scanPhase !== 'idle' ? 'scanning' : ''}`}>
                <div className={`scan-beam ${scanPhase === 'loading' ? 'active' : ''}`} />
              </div>

              {!result && !cameraError && scanPhase === 'idle' && (
                <div className="center-prompt">
                  <h2>把鏡頭當成筆記本</h2>
                  <p>對準眼前的動植物，輕輕按下「觀」，讓野誌為你寫下一筆。</p>
                </div>
              )}

              {cameraError && (
                <div className="status-banner error">
                  <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>鏡頭未開啟</h3>
                  <p style={{ marginBottom: 0, color: 'var(--muted)' }}>{cameraError}</p>
                </div>
              )}

              <ScanOverlay
                phase={scanPhase}
                tip={loadingTip}
                photoUrl={lastPhoto}
                mirrorPhoto={!demoMode}
              />

              {result && (
                <div className={`result-wrap ${resultEnter ? 'enter' : ''} ${unlocking ? 'exiting' : ''}`}>
                  <ResultSheet
                    result={result}
                    selected={selected}
                    onSelect={setSelected}
                    onUnlock={handleUnlock}
                    onClose={() => setResult(null)}
                    unlocking={unlocking}
                    alreadyNote={alreadyNote}
                    photoUrl={lastPhoto}
                    mirrorPhoto={!demoMode}
                  />
                </div>
              )}
            </>
          )}

          {view === 'codex' && (
            <>
              <CodexPanel entries={entries} onSelect={openCodexEntry} />
              {result && (
                <div className={`codex-detail-layer ${resultEnter ? 'enter' : ''} ${unlocking ? 'exiting' : ''}`}>
                  <ResultSheet
                    result={result}
                    selected={selected}
                    onSelect={setSelected}
                    onUnlock={handleUnlock}
                    onClose={() => setResult(null)}
                    unlocking={unlocking}
                    alreadyNote={alreadyNote}
                    photoUrl={lastPhoto}
                    mirrorPhoto={false}
                  />
                </div>
              )}
            </>
          )}

          {view === 'map' && (
            <MapPanel
              entries={entries}
              userLocation={location}
              focus={mapFocus}
              onFocusHotspot={(p) => setMapFocus(p)}
            />
          )}
        </main>

        {view === 'scanner' && (
          <footer className="bottom-dock">
            <div className="dock-meta">{status}</div>
            <button
              type="button"
              className={`scan-btn ${shutterBump ? 'pressed' : ''} ${scanning ? 'busy' : ''}`}
              onClick={() => void handleScan()}
              disabled={scanning || unlocking}
              aria-label="觀察物種"
            >
              {!scanning && <span className="pulse" />}
            </button>
            <div className="dock-meta" style={{ textAlign: 'right' }}>
              {location
                ? `${location.lat.toFixed(3)}°N ${location.lng.toFixed(3)}°E`
                : '定位稍候'}
            </div>
          </footer>
        )}

        {toast && (
          <UnlockToast
            title={toast.title}
            subtitle={toast.subtitle}
            photoUrl={toast.photoUrl}
            isNew={toast.isNew}
            onDone={() => setToast(null)}
          />
        )}
      </div>
    </div>
  )
}
