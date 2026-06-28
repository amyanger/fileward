import { useState } from 'react'
import { runTransform } from '../../lib/runWorker'
import type { PanelProps } from '../../components/ToolPage'
import type { ExtractTextOptions } from './transform'

export function ExtractTextPanel({ files, busy, onRun }: PanelProps) {
  const [pageBreaks, setPageBreaks] = useState(true)
  const makeWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={pageBreaks}
          onChange={(e) => setPageBreaks(e.target.checked)}
        />
        Mark page breaks in the text
      </label>
      <button
        disabled={busy || files.length === 0}
        onClick={() =>
          onRun(() =>
            runTransform<ExtractTextOptions>(makeWorker, { files, options: { pageBreaks } }),
          )
        }
        className="btn-primary"
      >
        {busy ? 'Working…' : 'Extract text'}
      </button>
    </div>
  )
}
