import { useState } from 'react'
import { runTransform } from '../../lib/runWorker'
import type { PanelProps } from '../../components/ToolPage'
import type { ImagesToPdfOptions } from './transform'

export function ImagesToPdfPanel({ files, busy, onRun }: PanelProps) {
  const [pageSize, setPageSize] = useState<ImagesToPdfOptions['pageSize']>('fit')
  const [orientation, setOrientation] = useState<ImagesToPdfOptions['orientation']>('portrait')
  const makeWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  return (
    <div className="space-y-3">
      <label className="field-label">
        Page size
        <select
          value={pageSize}
          onChange={(e) => setPageSize(e.target.value as ImagesToPdfOptions['pageSize'])}
          className="field-input"
        >
          <option value="fit">Fit to image</option>
          <option value="a4">A4</option>
        </select>
      </label>
      {pageSize === 'a4' && (
        <label className="field-label">
          Orientation
          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as ImagesToPdfOptions['orientation'])}
            className="field-input"
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </label>
      )}
      <button
        disabled={busy || files.length === 0}
        onClick={() =>
          onRun(() =>
            runTransform<ImagesToPdfOptions>(makeWorker, { files, options: { pageSize, orientation } }),
          )
        }
        className="btn-primary"
      >
        {busy ? 'Working…' : 'Create PDF'}
      </button>
    </div>
  )
}
