import { TOOLS } from '../tools/registry'

export function ToolHub({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        🔒 Everything runs in your browser. Your files never leave your device —
        try it with your wifi off.
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <button
            key={t.def.id}
            onClick={() => onPick(t.def.id)}
            className="rounded-xl border bg-white p-5 text-left transition hover:border-blue-400 hover:shadow"
          >
            <h3 className="font-semibold">{t.def.title}</h3>
            <p className="text-sm text-slate-500">{t.def.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
