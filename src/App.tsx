import { useState } from 'react'
import { ToolHub } from './components/ToolHub'
import { ToolPage } from './components/ToolPage'
import { WardMark } from './components/icons'
import { TOOLS } from './tools/registry'

export default function App() {
  const [active, setActive] = useState<string | null>(null)
  const entry = TOOLS.find((t) => t.def.id === active) ?? null

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3.5">
          <button
            onClick={() => setActive(null)}
            className="flex items-center gap-2.5 rounded-lg text-left"
            aria-label="Fileward home"
          >
            <WardMark className="h-7 w-7 text-accent" />
            <span className="text-lg font-semibold tracking-tightish">Fileward</span>
          </button>
          <span className="chip" title="Fileward makes no network requests while it works.">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            No network access
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {entry ? (
          <ToolPage tool={entry.def} renderPanel={entry.renderPanel} onBack={() => setActive(null)} />
        ) : (
          <ToolHub onPick={setActive} />
        )}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-6 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-medium text-ink">Fileward</span> — file tools that run entirely on
            your device.
          </p>
          <p className="font-mono text-xs text-faint">No uploads · No accounts · No tracking</p>
        </div>
      </footer>
    </div>
  )
}
