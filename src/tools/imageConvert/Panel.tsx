import { useState } from 'react'
import { runTransform } from '../../lib/runWorker'
import type { PanelProps } from '../../components/ToolPage'
import type { ImageConvertOptions } from './transform'

export function ImageConvertPanel({ files, busy, onRun }: PanelProps) {
  const [format, setFormat] = useState<ImageConvertOptions['format']>('image/jpeg')
  const [quality, setQuality] = useState(0.8)
  const [maxWidth, setMaxWidth] = useState(0) // 0 = keep original size
  const makeWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  return (
    <div className="space-y-3">
      <label className="field-label">
        Format
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as ImageConvertOptions['format'])}
          className="field-input"
        >
          <option value="image/jpeg">JPG</option>
          <option value="image/png">PNG</option>
          <option value="image/webp">WebP</option>
        </select>
      </label>
      {format !== 'image/png' && (
        <label className="field-label">
          Quality: {Math.round(quality * 100)}%
          <input
            type="range" min={0.1} max={1} step={0.05} value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="range-input"
          />
        </label>
      )}
      <label className="field-label">
        Max width (px) — leave 0 to keep original
        <input
          type="number" min={0} step={50} value={maxWidth}
          onChange={(e) => setMaxWidth(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          className="field-input"
        />
      </label>
      <button
        disabled={busy || files.length === 0}
        onClick={() =>
          onRun(() =>
            runTransform<ImageConvertOptions>(makeWorker, {
              files,
              options: { format, quality, maxWidth: maxWidth > 0 ? maxWidth : undefined },
            }),
          )
        }
        className="btn-primary"
      >
        {busy ? 'Working…' : 'Convert'}
      </button>
    </div>
  )
}
