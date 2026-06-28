// src/tools/organizePages/Panel.tsx
import { useEffect, useState } from 'react'
import { runTransform } from '../../lib/runWorker'
import { renderThumbnails } from '../../lib/renderThumbnails'
import type { PanelProps } from '../../components/ToolPage'
import type { OrganizePagesOptions, PageOp } from './transform'

type Thumb = { index: number; dataUrl: string }

export function OrganizePagesPanel({ files, busy, onRun }: PanelProps) {
  const [thumbs, setThumbs] = useState<Thumb[]>([])
  const [ops, setOps] = useState<PageOp[]>([])
  const [loading, setLoading] = useState(false)
  const file = files[0]
  const makeWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })

  useEffect(() => {
    if (!file) {
      setThumbs([])
      setOps([])
      return
    }
    let cancelled = false
    setThumbs([])
    setOps([])
    setLoading(true)
    ;(async () => {
      try {
        for await (const t of renderThumbnails(file.bytes)) {
          if (cancelled) return
          setThumbs((prev) => [...prev, t])
          setOps((prev) => [...prev, { srcPageIndex: t.index, rotation: 0 }])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [file])

  const thumbFor = (srcPageIndex: number) =>
    thumbs.find((t) => t.index === srcPageIndex)?.dataUrl

  const move = (i: number, dir: -1 | 1) =>
    setOps((prev) => {
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  const rotate = (i: number) =>
    setOps((prev) => prev.map((o, k) => (k === i ? { ...o, rotation: (o.rotation + 90) % 360 } : o)))
  const remove = (i: number) => setOps((prev) => prev.filter((_, k) => k !== i))

  return (
    <div className="space-y-3">
      {loading && <p className="text-sm text-muted">Rendering pages…</p>}
      {ops.length === 0 && !loading && (
        <p className="text-sm text-muted">Add a PDF to organize its pages.</p>
      )}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {ops.map((op, i) => (
          <div key={`${op.srcPageIndex}-${i}`} className="rounded-lg border border-line p-2">
            <div className="aspect-[3/4] overflow-hidden rounded bg-white">
              {thumbFor(op.srcPageIndex) && (
                <img
                  src={thumbFor(op.srcPageIndex)}
                  alt={`Page ${op.srcPageIndex + 1}`}
                  className="h-full w-full object-contain"
                  style={{ transform: `rotate(${op.rotation}deg)` }}
                />
              )}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move left">◀</button>
              <button onClick={() => rotate(i)} aria-label="Rotate">⟳</button>
              <button onClick={() => remove(i)} aria-label="Delete">🗑</button>
              <button onClick={() => move(i, 1)} disabled={i === ops.length - 1} aria-label="Move right">▶</button>
            </div>
          </div>
        ))}
      </div>
      <button
        disabled={busy || !file || ops.length === 0}
        onClick={() =>
          onRun(() =>
            runTransform<OrganizePagesOptions>(makeWorker, { files: [file], options: { ops } }),
          )
        }
        className="btn-primary"
      >
        {busy ? 'Working…' : 'Save PDF'}
      </button>
    </div>
  )
}
