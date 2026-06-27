import { useState } from 'react'
import { runTransform } from '../../lib/runWorker'
import type { PanelProps } from '../../components/ToolPage'
import type { CompressPdfOptions } from './transform'

export function CompressPdfPanel({ files, busy, onRun }: PanelProps) {
  const [quality, setQuality] = useState(0.7)
  const [scale, setScale] = useState(1.5)
  const makeWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  return (
    <div className="space-y-3">
      <label className="field-label">
        JPEG quality: {Math.round(quality * 100)}%
        <input
          type="range" min={0.3} max={0.9} step={0.05} value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
          className="range-input"
        />
      </label>
      <label className="field-label">
        Render scale: {scale.toFixed(1)}×
        <input
          type="range" min={1} max={2} step={0.1} value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="range-input"
        />
      </label>
      <button
        disabled={busy || files.length === 0}
        onClick={() =>
          onRun(() =>
            runTransform<CompressPdfOptions>(makeWorker, { files, options: { quality, scale } }),
          )
        }
        className="btn-primary"
      >
        {busy ? 'Working…' : 'Compress'}
      </button>
    </div>
  )
}
