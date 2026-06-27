import { useState, type ReactNode } from 'react'
import { Dropzone, toInputFile } from './Dropzone'
import { FileList } from './FileList'
import { ResultView } from './ResultView'
import { ToolIcon } from './icons'
import type { InputFile, ToolDef, ToolResult } from '../types'

export interface PanelProps {
  files: InputFile[]
  busy: boolean
  onRun: (run: () => Promise<ToolResult>) => void
}

export function ToolPage({
  tool,
  renderPanel,
  onBack,
}: {
  tool: ToolDef
  renderPanel: (props: PanelProps) => ReactNode
  onBack: () => void
}) {
  const [files, setFiles] = useState<InputFile[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ToolResult | null>(null)

  async function addFiles(picked: File[]) {
    const mapped = await Promise.all(picked.map(toInputFile))
    setFiles((prev) => [...prev, ...mapped])
    setResult(null)
  }

  async function onRun(run: () => Promise<ToolResult>) {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      setResult(await run())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={onBack} className="text-sm font-medium text-muted hover:text-ink">
        ← All tools
      </button>

      <div className="mt-4 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <ToolIcon id={tool.id} className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tightish">{tool.title}</h1>
          <p className="mt-1 text-muted">{tool.description}</p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <section>
          <p className="eyebrow">1 — Add files</p>
          <div className="mt-2">
            <Dropzone accept={tool.accept} onFiles={addFiles} />
          </div>
          <FileList
            items={files}
            onRemove={(id) => setFiles((p) => p.filter((f) => f.id !== id))}
            onReorder={(from, to) =>
              setFiles((p) => {
                const next = [...p]
                const [m] = next.splice(from, 1)
                next.splice(to, 0, m)
                return next
              })
            }
          />
        </section>

        <section>
          <p className="eyebrow">2 — Set options & run</p>
          <div className="mt-2 rounded-xl border border-line bg-surface p-5 shadow-card">
            {renderPanel({ files, busy, onRun })}
          </div>
        </section>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <ResultView result={result} />
      </div>
    </div>
  )
}
