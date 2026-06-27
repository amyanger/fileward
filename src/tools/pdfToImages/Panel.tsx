import { useState } from 'react'
import { runTransform } from '../../lib/runWorker'
import type { PanelProps } from '../../components/ToolPage'
import type { PdfToImagesOptions } from './transform'

export function PdfToImagesPanel({ files, busy, onRun }: PanelProps) {
  const [format, setFormat] = useState<PdfToImagesOptions['format']>('image/png')
  const [scale, setScale] = useState(1)
  const makeWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  return (
    <div className="space-y-3">
      <label className="field-label">
        Format
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as PdfToImagesOptions['format'])}
          className="field-input"
        >
          <option value="image/png">PNG</option>
          <option value="image/jpeg">JPG</option>
        </select>
      </label>
      <label className="field-label">
        Scale: {scale}×
        <input
          type="range" min={1} max={4} step={1} value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="range-input"
        />
      </label>
      <button
        disabled={busy || files.length === 0}
        onClick={() =>
          onRun(() =>
            runTransform<PdfToImagesOptions>(makeWorker, { files, options: { format, scale } }),
          )
        }
        className="btn-primary"
      >
        {busy ? 'Working…' : 'Export images'}
      </button>
    </div>
  )
}
