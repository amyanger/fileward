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
    <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      {items.map((item, i) => (
        <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
          <span className="flex-1 truncate text-sm">{item.name}</span>
          <span className="font-mono text-xs text-faint">{formatBytes(item.bytes.byteLength)}</span>
          <button
            aria-label={`Move ${item.name} up`}
            disabled={i === 0}
            onClick={() => onReorder(i, i - 1)}
            className="rounded px-1.5 text-muted transition hover:text-ink disabled:opacity-30"
          >
            ↑
          </button>
          <button
            aria-label={`Move ${item.name} down`}
            disabled={i === items.length - 1}
            onClick={() => onReorder(i, i + 1)}
            className="rounded px-1.5 text-muted transition hover:text-ink disabled:opacity-30"
          >
            ↓
          </button>
          <button
            aria-label={`Remove ${item.name}`}
            onClick={() => onRemove(item.id)}
            className="rounded px-1.5 text-muted transition hover:text-red-600"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  )
}
