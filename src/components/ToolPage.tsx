import { useState, type ReactNode } from 'react'
import { Dropzone, toInputFile } from './Dropzone'
import { FileList } from './FileList'
import { ResultView } from './ResultView'
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
      <button onClick={onBack} className="mb-4 text-sm text-blue-600">
        ← All tools
      </button>
      <h2 className="text-lg font-semibold">{tool.title}</h2>
      <p className="mb-4 text-sm text-slate-500">{tool.description}</p>
      <Dropzone accept={tool.accept} onFiles={addFiles} />
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
      <div className="mt-4">{renderPanel({ files, busy, onRun })}</div>
      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <ResultView result={result} />
    </div>
  )
}
