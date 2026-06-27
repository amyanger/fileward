import type { ToolResult } from '../types'
import { downloadOutputs } from '../lib/download'

export function ResultView({ result }: { result: ToolResult | null }) {
  if (!result) return null
  return (
    <div className="mt-6 rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">
          {result.outputs.length} file{result.outputs.length === 1 ? '' : 's'} ready
        </p>
        <button
          onClick={() => downloadOutputs(result.outputs)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white"
        >
          Download {result.outputs.length > 1 ? 'all (zip)' : ''}
        </button>
      </div>
      {result.notes?.map((n) => (
        <p key={n} className="mt-2 text-sm text-slate-500">
          {n}
        </p>
      ))}
    </div>
  )
}
