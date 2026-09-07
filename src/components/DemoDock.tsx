import { useState } from 'react'

interface DemoDockProps {
  demoMode: boolean
  onToggleDemo: () => void
  onSeedDemo: () => void
  onClear: () => void
}

export function DemoDock({ demoMode, onToggleDemo, onSeedDemo, onClear }: DemoDockProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`demo-dock ${open ? 'open' : ''}`} role="region" aria-label="Demo 控制">
      <button
        type="button"
        className="demo-quiet-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="錄影設定"
      >
        {open ? '收合設定' : '錄影設定'}
      </button>

      {open && (
        <div className="demo-quiet-panel">
          <button
            type="button"
            className={`demo-quiet-btn ${demoMode ? 'on' : ''}`}
            onClick={onToggleDemo}
          >
            {demoMode ? '● Demo 影片' : '○ 真實鏡頭'}
          </button>
          <button type="button" className="demo-quiet-btn" onClick={onSeedDemo}>
            載入示範圖鑑
          </button>
          <button type="button" className="demo-quiet-btn" onClick={onClear}>
            清空圖鑑
          </button>
        </div>
      )}
    </div>
  )
}
