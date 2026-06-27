import type { InputFile } from '../types'
import { formatBytes } from '../lib/format'

export function FileList({
  items,
  onRemove,
  onReorder,
}: {
  items: InputFile[]
  onRemove: (id: string) => void
  onReorder: (from: number, to: number) => void
}) {
  if (items.length === 0) return null
  return (
    <ul className="mt-4 divide-y rounded-lg border bg-white">
      {items.map((item, i) => (
        <li key={item.id} className="flex items-center gap-3 px-4 py-2">
          <span className="flex-1 truncate">{item.name}</span>
          <span className="text-xs text-slate-400">{formatBytes(item.bytes.byteLength)}</span>
          <button
            aria-label={`Move ${item.name} up`}
            disabled={i === 0}
            onClick={() => onReorder(i, i - 1)}
            className="px-1 text-slate-500 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            aria-label={`Move ${item.name} down`}
            disabled={i === items.length - 1}
            onClick={() => onReorder(i, i + 1)}
            className="px-1 text-slate-500 disabled:opacity-30"
          >
            ↓
          </button>
          <button
            aria-label={`Remove ${item.name}`}
            onClick={() => onRemove(item.id)}
            className="px-1 text-red-500"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  )
}
