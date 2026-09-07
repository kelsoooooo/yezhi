import { RARITY_LABEL } from '../lib/game'
import type { CodexEntry } from '../types'

interface CodexPanelProps {
  entries: CodexEntry[]
  onSelect: (entry: CodexEntry) => void
}

function LeafMark() {
  return (
    <svg className="leaf-mark" viewBox="0 0 80 80" fill="none" aria-hidden>
      <path
        d="M40 8c14 10 24 26 24 40 0 14-10 24-24 24S16 62 16 48C16 34 26 18 40 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M40 18v44" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
      <path
        d="M40 28c8 4 14 12 16 20M40 36c-7 4-12 10-14 16"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.45"
      />
    </svg>
  )
}

export function CodexPanel({ entries, onSelect }: CodexPanelProps) {
  return (
    <div className="journal-page codex-page">
      <header className="journal-intro">
        <p className="eyebrow">Field Notes</p>
        <h2>我的圖鑑</h2>
        <p className="lede">已寫下 {entries.length} 種。每一次觀察，都是一頁新的手記。</p>
      </header>

      {entries.length === 0 ? (
        <div className="empty-note">
          <LeafMark />
          <h3>空白的一頁</h3>
          <p>回到「觀察」，對準一株草、一隻鳥，輕輕按下中央的「觀」。</p>
        </div>
      ) : (
        <div className="codex-grid">
          {entries.map((e) => (
            <button key={e.id} type="button" className="codex-card" onClick={() => onSelect(e)}>
              <div className="thumb">
                {e.photoDataUrl ? (
                  <img src={e.photoDataUrl} alt={e.candidate.commonNameZh} />
                ) : (
                  <span className="placeholder">未附影像</span>
                )}
              </div>
              <div className="body">
                <p className="name">{e.candidate.commonNameZh}</p>
                <p className="sci">{e.candidate.scientificName}</p>
                <span className={`rarity ${e.candidate.rarity}`}>
                  {RARITY_LABEL[e.candidate.rarity]} · {Math.round(e.bestConfidence * 100)}%
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
