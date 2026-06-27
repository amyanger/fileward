import { useState } from 'react'
import { ToolHub } from './components/ToolHub'
import { ToolPage } from './components/ToolPage'
import { TOOLS } from './tools/registry'

export default function App() {
  const [active, setActive] = useState<string | null>(null)
  const entry = TOOLS.find((t) => t.def.id === active) ?? null
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white px-6 py-4">
        <button onClick={() => setActive(null)} className="text-left">
          <h1 className="text-xl font-bold">Fileward</h1>
          <p className="text-sm text-slate-500">
            PDF &amp; image tools that never upload your files.
          </p>
        </button>
      </header>
      <section className="p-6">
        {entry ? (
          <ToolPage tool={entry.def} renderPanel={entry.renderPanel} onBack={() => setActive(null)} />
        ) : (
          <ToolHub onPick={setActive} />
        )}
      </section>
    </main>
  )
}
