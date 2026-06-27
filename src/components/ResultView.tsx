import type { ToolResult } from '../types'
import { downloadOutputs } from '../lib/download'

export function ResultView({ result }: { result: ToolResult | null }) {
  if (!result) return null
  return (
    <div className="rounded-xl border border-accent/30 bg-accent-soft/50 p-5">
      <p className="eyebrow text-accent">Done — ready on your device</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium">
          {result.outputs.length} file{result.outputs.length === 1 ? '' : 's'} ready
        </p>
        <button onClick={() => downloadOutputs(result.outputs)} className="btn-accent">
          Download {result.outputs.length > 1 ? 'all (zip)' : ''}
        </button>
      </div>
      {result.notes?.map((n, i) => (
        <p key={i} className="mt-2 text-sm text-muted">
          {n}
        </p>
      ))}
    </div>
  )
}
