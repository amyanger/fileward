import { useState } from 'react'
import { runTransform } from '../../lib/runWorker'
import type { PanelProps } from '../../components/ToolPage'
import type { MergeSplitOptions } from './transform'

export function MergeSplitPanel({ files, busy, onRun }: PanelProps) {
  const [mode, setMode] = useState<'merge' | 'extract'>('merge')
  const [range, setRange] = useState('')
  const makeWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })

  function buildOptions(): MergeSplitOptions {
    if (mode === 'merge') return { mode: 'merge' }
    return { mode: 'extract', range }
  }

  return (
    <div className="space-y-3">
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Mode</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="ms-mode"
            value="merge"
            checked={mode === 'merge'}
            onChange={() => setMode('merge')}
          />
          Merge all files into one PDF
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="ms-mode"
            value="extract"
            checked={mode === 'extract'}
            onChange={() => setMode('extract')}
          />
          Extract page range
        </label>
      </fieldset>
      {mode === 'extract' && (
        <label className="block text-sm">
          Page range (e.g. 1,3-5)
          <input
            type="text"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            placeholder="1,3-5"
            className="mt-1 block w-full rounded border p-2"
          />
        </label>
      )}
      <button
        disabled={busy || files.length === 0 || (mode === 'extract' && range.trim() === '')}
        onClick={() => onRun(() => runTransform<MergeSplitOptions>(makeWorker, { files, options: buildOptions() }))}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
      >
        {busy ? 'Working…' : 'Run'}
      </button>
    </div>
  )
}
