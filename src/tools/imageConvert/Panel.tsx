import { useState } from 'react'
import { runTransform } from '../../lib/runWorker'
import type { PanelProps } from '../../components/ToolPage'
import type { ImageConvertOptions } from './transform'

export function ImageConvertPanel({ files, busy, onRun }: PanelProps) {
  const [format, setFormat] = useState<ImageConvertOptions['format']>('image/jpeg')
  const [quality, setQuality] = useState(0.8)
  const makeWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  return (
    <div className="space-y-3">
      <label className="block text-sm">
        Format
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as ImageConvertOptions['format'])}
          className="mt-1 block w-full rounded border p-2"
        >
          <option value="image/jpeg">JPG</option>
          <option value="image/png">PNG</option>
          <option value="image/webp">WebP</option>
        </select>
      </label>
      {format !== 'image/png' && (
        <label className="block text-sm">
          Quality: {Math.round(quality * 100)}%
          <input
            type="range" min={0.1} max={1} step={0.05} value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="block w-full"
          />
        </label>
      )}
      <button
        disabled={busy || files.length === 0}
        onClick={() =>
          onRun(() => runTransform<ImageConvertOptions>(makeWorker, { files, options: { format, quality } }))
        }
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
      >
        {busy ? 'Working…' : 'Convert'}
      </button>
    </div>
  )
}
