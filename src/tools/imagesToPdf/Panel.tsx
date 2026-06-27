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
      <label className="block text-sm">
        Page size
        <select
          value={pageSize}
          onChange={(e) => setPageSize(e.target.value as ImagesToPdfOptions['pageSize'])}
          className="mt-1 block w-full rounded border p-2"
        >
          <option value="fit">Fit to image</option>
          <option value="a4">A4</option>
        </select>
      </label>
      {pageSize === 'a4' && (
        <label className="block text-sm">
          Orientation
          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as ImagesToPdfOptions['orientation'])}
            className="mt-1 block w-full rounded border p-2"
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
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
      >
        {busy ? 'Working…' : 'Create PDF'}
      </button>
    </div>
  )
}
