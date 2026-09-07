import { RARITY_LABEL } from '../lib/game'
import type { IdentifyResult, SpeciesCandidate } from '../types'

interface ResultSheetProps {
  result: IdentifyResult
  selected: SpeciesCandidate | null
  onSelect: (c: SpeciesCandidate) => void
  onUnlock: () => void
  onClose: () => void
  unlocking: boolean
  alreadyNote?: string
  photoUrl?: string
  mirrorPhoto?: boolean
}

export function ResultSheet({
  result,
  selected,
  onSelect,
  onUnlock,
  onClose,
  unlocking,
  alreadyNote,
  photoUrl,
  mirrorPhoto = false,
}: ResultSheetProps) {
  if (!result.detected || result.candidates.length === 0) {
    return (
      <div className="result-sheet fullscreen">
        {photoUrl && (
          <div className={`result-shot ${mirrorPhoto ? 'mirror' : ''}`}>
            <img src={photoUrl} alt="剛拍下的畫面" />
          </div>
        )}
        <div className="result-body">
          <div className="result-head">
            <div>
              <h3>沒有看清楚</h3>
              <p>{result.scanNotes || '再靠近一點，或換個光線試試。'}</p>
            </div>
            <button type="button" className="close-x" onClick={onClose} aria-label="關閉">
              ×
            </button>
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={onClose}>
              再試一次
            </button>
          </div>
        </div>
      </div>
    )
  }

  const active = selected || result.candidates[0]

  return (
    <div className="result-sheet fullscreen">
      {photoUrl && (
        <div className={`result-shot ${mirrorPhoto ? 'mirror' : ''}`}>
          <img src={photoUrl} alt="剛拍下的畫面" />
          <div className="result-shot-fade" aria-hidden />
        </div>
      )}

      <div className="result-body">
        <div className="result-head">
          <div>
            <h3>可能是……</h3>
            <p>
              {result.category} · {result.candidates.length} 個候選
              {result.scanNotes ? ` · ${result.scanNotes}` : ''}
            </p>
          </div>
          <button type="button" className="close-x" onClick={onClose} aria-label="關閉">
            ×
          </button>
        </div>

        <div className="candidates">
          {result.candidates.map((c) => {
            const isSelected =
              active.scientificName === c.scientificName && active.commonNameZh === c.commonNameZh
            return (
              <button
                key={`${c.scientificName}-${c.commonNameZh}`}
                type="button"
                className={`candidate ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(c)}
              >
                <div>
                  <p className="title">{c.commonNameZh}</p>
                  <p className="meta">
                    {c.commonNameEn} · <em>{c.scientificName}</em> · {RARITY_LABEL[c.rarity]}
                  </p>
                </div>
                <div className="conf">{Math.round(c.confidence * 100)}%</div>
                <div className="conf-bar">
                  <i style={{ width: `${Math.round(c.confidence * 100)}%` }} />
                </div>
              </button>
            )
          })}
        </div>

        {active && (
          <div className="detail">
            <h4>{active.commonNameZh}</h4>
            <p className="sci">
              {active.commonNameEn} · {active.scientificName}
            </p>
            <p>
              <strong>棲地　</strong>
              {active.habitat}
            </p>
            <p>
              <strong>與香港　</strong>
              {active.hkRelevance}
            </p>
            <p>
              <strong>保育　</strong>
              {active.conservation}
            </p>
            <p>
              <strong>小記　</strong>
              {active.funFact}
            </p>
            <div className="traits">
              {active.traits?.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            {alreadyNote && <p className="already-note">{alreadyNote}</p>}
            <div className="actions">
              <button type="button" className="btn" onClick={onUnlock} disabled={unlocking}>
                {unlocking ? '寫入中…' : '寫入圖鑑'}
              </button>
              <button type="button" className="btn ghost" onClick={onClose}>
                繼續觀察
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
