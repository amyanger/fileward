import { TOOLS } from '../tools/registry'
import { ToolIcon, LockIcon } from './icons'

const STEPS = [
  { n: '01', title: 'Pick a tool', body: 'Choose what you want to do — merge, compress, convert, and more.' },
  { n: '02', title: 'Add your files', body: 'Drag them in or browse. They load straight into this tab.' },
  { n: '03', title: 'Download results', body: 'Work happens on your device, then you save the output. Nothing is sent.' },
]

function inputTag(accept: string) {
  return accept.startsWith('image/') ? 'Images' : 'PDF'
}

export function ToolHub({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="space-y-16">
      {/* Hero — the thesis: nothing leaves the device. */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="eyebrow">Local-first file toolkit</p>
          <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tightish sm:text-5xl">
            Your files never
            <br />
            leave this device.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
            Fileward does PDF and image work — merging, compressing, converting — entirely inside
            your browser. No uploads, no accounts, no servers touching your documents.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="#tools" className="btn-primary">
              Browse tools
            </a>
            <a href="#how" className="text-sm font-medium text-muted hover:text-ink">
              How it works →
            </a>
          </div>
        </div>

        {/* Signature: a "transfer ledger" instrument panel stating, in plain
            technical terms, that nothing is transmitted. */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <div className="flex items-center gap-2 text-accent">
            <LockIcon className="h-5 w-5" />
            <span className="font-mono text-xs uppercase tracking-[0.18em]">Transfer ledger</span>
          </div>
          <dl className="mt-5 divide-y divide-line font-mono text-sm">
            {[
              ['Files uploaded', '0'],
              ['Bytes sent to a server', '0'],
              ['Accounts required', '0'],
              ['Processed in your browser', '100%'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-faint">
            Don&apos;t take our word for it — turn off your wifi and everything still works.
          </p>
        </div>
      </section>

      {/* How it works — the clear instructions. */}
      <section id="how" className="scroll-mt-20">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tightish">Three steps, zero uploads</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-xl border border-line bg-surface p-5 shadow-card">
              <span className="font-mono text-sm text-accent">{s.n}</span>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Tools grid. */}
      <section id="tools" className="scroll-mt-20">
        <p className="eyebrow">Tools</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tightish">Pick a tool to start</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <button
              key={t.def.id}
              onClick={() => onPick(t.def.id)}
              className="group flex items-start gap-4 rounded-xl border border-line bg-surface p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lift"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <ToolIcon id={t.def.id} className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{t.def.title}</span>
                  <span className="chip shrink-0">{inputTag(t.def.accept)}</span>
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">
                  {t.def.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Why it stays private. */}
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
        <p className="eyebrow">Why it&apos;s private</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tightish">
          Built so your documents can&apos;t leak
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <h3 className="font-semibold">No upload step</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Files are read by this tab and processed in a background worker. They&apos;re never
              sent over the network.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Nothing stored</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              When you close the tab, the files are gone. There&apos;s no database and no account
              tied to your work.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Works offline</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Once the page has loaded, you can disconnect entirely. Every tool keeps running.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
