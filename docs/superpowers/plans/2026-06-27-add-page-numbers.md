# Add Page Numbers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new client-side "Add Page Numbers" tool that stamps page numbers onto each page of one or more PDFs, with configurable position, start number, and format.

**Architecture:** Follows Fileward's standard four-file tool pattern. Pure numbering/positioning logic lives in small unit-testable helpers; `transform.ts` composes them with `pdf-lib` to draw text on every page; `worker.ts` runs the transform off the main thread; `Panel.tsx` provides options and calls `runTransform`. Operates per-file in a batch, producing one numbered PDF per input (mirrors `compressPdf`).

**Tech Stack:** TypeScript, React 19, `pdf-lib` (already a dependency), Vite worker modules, Vitest + jsdom.

## Global Constraints

- 100% client-side. No network calls anywhere in the tool. (Fileward core guarantee.)
- Reuse the existing tool structure: `transform.ts` (pure), `worker.ts`, `Panel.tsx`, `transform.test.ts`, registered in `src/tools/registry.tsx`.
- No new dependencies. Use the existing `pdf-lib`.
- `pdf-lib` may be imported directly in `transform.ts` (proven by `mergeSplit`/`imagesToPdf` running in jsdom). Do NOT import `pdfjs-dist` in this tool — page numbering needs no rendering.
- Tool id: `page-numbers`. Title: `Add Page Numbers`. Description: `Stamp page numbers onto a PDF.` accept: `application/pdf`.
- Worker created via `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`.
- Reply protocol is `TransformReply` (`{ ok: true, result }` / `{ ok: false, error }`) — post via the same cast pattern as `imagesToPdf/worker.ts`.
- Commands: `npm run typecheck`, `npm run lint`, `npx vitest run`, `npm run build`.

---

### Task 1: Pure helpers — number formatting and anchor positioning

**Files:**
- Create: `src/tools/pageNumbers/helpers.ts`
- Test: `src/tools/pageNumbers/helpers.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type PageNumberFormat = 'plain' | 'slash' | 'word'`
  - `type PageNumberPosition = 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-center' | 'top-right'`
  - `formatPageNumber(format: PageNumberFormat, pageNum: number, total: number): string`
  - `anchorXY(position: PageNumberPosition, pageW: number, pageH: number, textW: number, fontSize: number, margin: number): { x: number; y: number }`

Notes on coordinates: `pdf-lib`'s origin is the bottom-left corner, y increases upward. Bottom rows sit at `y = margin`; top rows at `y = pageH - margin - fontSize`. Left `x = margin`; center `x = (pageW - textW) / 2`; right `x = pageW - margin - textW`.

- [ ] **Step 1: Write the failing test**

```ts
// src/tools/pageNumbers/helpers.test.ts
import { describe, it, expect } from 'vitest'
import { formatPageNumber, anchorXY } from './helpers'

describe('formatPageNumber', () => {
  it('plain shows just the number', () => {
    expect(formatPageNumber('plain', 3, 10)).toBe('3')
  })
  it('slash shows current / total', () => {
    expect(formatPageNumber('slash', 3, 10)).toBe('3 / 10')
  })
  it('word prefixes "Page"', () => {
    expect(formatPageNumber('word', 3, 10)).toBe('Page 3')
  })
})

describe('anchorXY', () => {
  const W = 600, H = 800, TW = 40, FS = 12, M = 24
  it('bottom-left sits at the margin', () => {
    expect(anchorXY('bottom-left', W, H, TW, FS, M)).toEqual({ x: 24, y: 24 })
  })
  it('bottom-center centers horizontally', () => {
    expect(anchorXY('bottom-center', W, H, TW, FS, M)).toEqual({ x: 280, y: 24 })
  })
  it('bottom-right hugs the right margin', () => {
    expect(anchorXY('bottom-right', W, H, TW, FS, M)).toEqual({ x: 536, y: 24 })
  })
  it('top-right drops below the top margin by one line', () => {
    expect(anchorXY('top-right', W, H, TW, FS, M)).toEqual({ x: 536, y: 764 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/pageNumbers/helpers.test.ts`
Expected: FAIL — cannot resolve `./helpers` (module/exports not defined).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/tools/pageNumbers/helpers.ts
export type PageNumberFormat = 'plain' | 'slash' | 'word'
export type PageNumberPosition =
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'top-left' | 'top-center' | 'top-right'

export function formatPageNumber(
  format: PageNumberFormat,
  pageNum: number,
  total: number,
): string {
  switch (format) {
    case 'slash':
      return `${pageNum} / ${total}`
    case 'word':
      return `Page ${pageNum}`
    default:
      return `${pageNum}`
  }
}

export function anchorXY(
  position: PageNumberPosition,
  pageW: number,
  pageH: number,
  textW: number,
  fontSize: number,
  margin: number,
): { x: number; y: number } {
  const isTop = position.startsWith('top-')
  const y = isTop ? pageH - margin - fontSize : margin
  let x: number
  if (position.endsWith('-left')) x = margin
  else if (position.endsWith('-right')) x = pageW - margin - textW
  else x = (pageW - textW) / 2
  return { x, y }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tools/pageNumbers/helpers.test.ts`
Expected: PASS (7 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/tools/pageNumbers/helpers.ts src/tools/pageNumbers/helpers.test.ts
git commit -m "feat(page-numbers): pure number-format and anchor helpers"
```

---

### Task 2: Transform — stamp page numbers with pdf-lib

**Files:**
- Create: `src/tools/pageNumbers/transform.ts`
- Test: `src/tools/pageNumbers/transform.test.ts`

**Interfaces:**
- Consumes: `formatPageNumber`, `anchorXY`, `PageNumberFormat`, `PageNumberPosition` from `./helpers`; `InputFile`, `ToolResult` from `../../types`.
- Produces:
  - `interface PageNumbersOptions { position: PageNumberPosition; format: PageNumberFormat; startAt: number; fontSize: number; margin: number }`
  - `addPageNumbers(files: InputFile[], opts: PageNumbersOptions): Promise<ToolResult>`

Behavior: for each input PDF, load with `pdf-lib`, embed `StandardFonts.Helvetica`, and draw the formatted number on every page using `anchorXY` (computing text width with `font.widthOfTextAtSize`). Page `i` (0-based) is labelled `opts.startAt + i`; `total` passed to `formatPageNumber` is the page count. Output name: `<base>-numbered.pdf`. On a per-file error, push a `Skipped <name>: <message>` note and continue (mirrors `compressPdf`).

- [ ] **Step 1: Write the failing test**

```ts
// src/tools/pageNumbers/transform.test.ts
import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { addPageNumbers } from './transform'
import type { InputFile } from '../../types'

async function makePdf(pages: number): Promise<InputFile> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([600, 800])
  const bytes = await doc.save()
  return { id: 'x', name: 'doc.pdf', bytes: bytes.buffer.slice(0), type: 'application/pdf' }
}

describe('addPageNumbers', () => {
  it('returns one numbered PDF preserving the page count', async () => {
    const res = await addPageNumbers([await makePdf(3)], {
      position: 'bottom-center',
      format: 'slash',
      startAt: 1,
      fontSize: 12,
      margin: 24,
    })
    expect(res.outputs).toHaveLength(1)
    expect(res.outputs[0].name).toBe('doc-numbered.pdf')
    const out = await PDFDocument.load(new Uint8Array(await res.outputs[0].blob.arrayBuffer()))
    expect(out.getPageCount()).toBe(3)
  })

  it('reports a skip note for an invalid PDF instead of throwing', async () => {
    const bad: InputFile = {
      id: 'b', name: 'bad.pdf', bytes: new Uint8Array([1, 2, 3]).buffer, type: 'application/pdf',
    }
    const res = await addPageNumbers([bad], {
      position: 'bottom-right', format: 'plain', startAt: 1, fontSize: 12, margin: 24,
    })
    expect(res.outputs).toHaveLength(0)
    expect(res.notes?.[0]).toMatch(/Skipped bad\.pdf/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/pageNumbers/transform.test.ts`
Expected: FAIL — cannot resolve `./transform` / `addPageNumbers` not defined.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/tools/pageNumbers/transform.ts
import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { InputFile, ToolResult } from '../../types'
import {
  anchorXY,
  formatPageNumber,
  type PageNumberFormat,
  type PageNumberPosition,
} from './helpers'

export interface PageNumbersOptions {
  position: PageNumberPosition
  format: PageNumberFormat
  startAt: number
  fontSize: number
  margin: number
}

export async function addPageNumbers(
  files: InputFile[],
  opts: PageNumbersOptions,
): Promise<ToolResult> {
  const outputs = []
  const notes: string[] = []
  for (const file of files) {
    const base = file.name.replace(/\.[^.]+$/, '')
    try {
      const doc = await PDFDocument.load(new Uint8Array(file.bytes))
      const font = await doc.embedFont(StandardFonts.Helvetica)
      const pages = doc.getPages()
      const total = pages.length
      pages.forEach((page, i) => {
        const label = formatPageNumber(opts.format, opts.startAt + i, opts.startAt + total - 1)
        const textW = font.widthOfTextAtSize(label, opts.fontSize)
        const { width, height } = page.getSize()
        const { x, y } = anchorXY(opts.position, width, height, textW, opts.fontSize, opts.margin)
        page.drawText(label, { x, y, size: opts.fontSize, font })
      })
      const saved = await doc.save()
      outputs.push({
        name: `${base}-numbered.pdf`,
        blob: new Blob([new Uint8Array(saved)], { type: 'application/pdf' }),
      })
    } catch (err) {
      notes.push(`Skipped ${file.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return { outputs, notes: notes.length ? notes : undefined }
}
```

Note: `total` for the label is computed as `startAt + count - 1` so `slash` format reads correctly when the user starts numbering above 1 (e.g. start 5, 3 pages → `5 / 7`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tools/pageNumbers/transform.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/pageNumbers/transform.ts src/tools/pageNumbers/transform.test.ts
git commit -m "feat(page-numbers): pdf-lib transform that stamps page numbers"
```

---

### Task 3: Worker, Panel, icon, registry — wire the tool into the app

**Files:**
- Create: `src/tools/pageNumbers/worker.ts`
- Create: `src/tools/pageNumbers/Panel.tsx`
- Modify: `src/components/icons.tsx` (add a `page-numbers` glyph to `ToolGlyphs`)
- Modify: `src/tools/registry.tsx` (import panel, add `ToolEntry`)

**Interfaces:**
- Consumes: `addPageNumbers`, `PageNumbersOptions` from `./transform`; `runTransform` from `../../lib/runWorker`; `PanelProps` from `../../components/ToolPage`; `TransformMessage`, `TransformReply` from `../../types`.
- Produces: `PageNumbersPanel(props: PanelProps): JSX.Element`; a registered tool with id `page-numbers`.

This task has no new unit test (matches existing tools — `imagesToPdf` etc. have no worker/Panel tests). Its gate is typecheck + lint + build passing and a manual Safari smoke test.

- [ ] **Step 1: Create the worker**

```ts
// src/tools/pageNumbers/worker.ts
import type { TransformMessage, TransformReply } from '../../types'
import { addPageNumbers, type PageNumbersOptions } from './transform'

self.onmessage = async (e: MessageEvent<TransformMessage<PageNumbersOptions>>) => {
  try {
    const result = await addPageNumbers(e.data.files, e.data.options)
    ;(self as unknown as Worker).postMessage({ ok: true, result } as TransformReply)
  } catch (err) {
    ;(self as unknown as Worker).postMessage({
      ok: false,
      error: (err as Error).message,
    } as TransformReply)
  }
}
```

- [ ] **Step 2: Create the Panel**

```tsx
// src/tools/pageNumbers/Panel.tsx
import { useState } from 'react'
import { runTransform } from '../../lib/runWorker'
import type { PanelProps } from '../../components/ToolPage'
import type { PageNumbersOptions } from './transform'

export function PageNumbersPanel({ files, busy, onRun }: PanelProps) {
  const [position, setPosition] = useState<PageNumbersOptions['position']>('bottom-center')
  const [format, setFormat] = useState<PageNumbersOptions['format']>('plain')
  const [startAt, setStartAt] = useState(1)
  const makeWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  return (
    <div className="space-y-3">
      <label className="field-label">
        Position
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value as PageNumbersOptions['position'])}
          className="field-input"
        >
          <option value="bottom-center">Bottom center</option>
          <option value="bottom-left">Bottom left</option>
          <option value="bottom-right">Bottom right</option>
          <option value="top-center">Top center</option>
          <option value="top-left">Top left</option>
          <option value="top-right">Top right</option>
        </select>
      </label>
      <label className="field-label">
        Format
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as PageNumbersOptions['format'])}
          className="field-input"
        >
          <option value="plain">1</option>
          <option value="slash">1 / N</option>
          <option value="word">Page 1</option>
        </select>
      </label>
      <label className="field-label">
        Start at
        <input
          type="number" min={0} value={startAt}
          onChange={(e) => setStartAt(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          className="field-input"
        />
      </label>
      <button
        disabled={busy || files.length === 0}
        onClick={() =>
          onRun(() =>
            runTransform<PageNumbersOptions>(makeWorker, {
              files,
              options: { position, format, startAt, fontSize: 12, margin: 24 },
            }),
          )
        }
        className="btn-primary"
      >
        {busy ? 'Working…' : 'Add page numbers'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Add the tool glyph**

In `src/components/icons.tsx`, add this entry inside the `ToolGlyphs` record (e.g. after the `'image-convert'` entry):

```tsx
  'page-numbers': (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
      <path d="M8.5 8h7M8.5 11h7" />
      <path d="M14 14.5h2.5v3.5H14v-3.5Z" />
    </>
  ),
```

- [ ] **Step 4: Register the tool**

In `src/tools/registry.tsx`, add the import alongside the others:

```tsx
import { PageNumbersPanel } from './pageNumbers/Panel'
```

and add this entry to the `TOOLS` array (place it after the `compress-pdf` entry so PDF tools group together):

```tsx
  {
    def: { id: 'page-numbers', title: 'Add Page Numbers', description: 'Stamp page numbers onto a PDF.', accept: 'application/pdf' },
    renderPanel: (p) => <PageNumbersPanel {...p} />,
  },
```

- [ ] **Step 5: Verify typecheck, lint, tests, and build**

Run: `npm run typecheck && npm run lint && npx vitest run && npm run build`
Expected: all pass; build completes with no errors.

- [ ] **Step 6: Manual smoke test in Safari**

Run: `npm run dev`, open the printed `localhost` URL in Safari. Pick **Add Page Numbers**, drop in a multi-page PDF, try each position/format, click **Add page numbers**, download, and confirm the numbers render where expected. (This exercises the worker + Vite worker-URL wiring, which unit tests don't cover.)

- [ ] **Step 7: Commit**

```bash
git add src/tools/pageNumbers/worker.ts src/tools/pageNumbers/Panel.tsx src/components/icons.tsx src/tools/registry.tsx
git commit -m "feat(page-numbers): worker, panel, icon, and registry wiring"
```

---

## Self-Review

**Spec coverage** (spec Tool 2 — Add Page Numbers):
- Position: 6 anchors → `PageNumberPosition` + `anchorXY` (Task 1), select (Task 3). ✓
- Start number → `startAt` option (Tasks 2, 3). ✓
- Format `1` / `1 / N` / `Page 1` → `formatPageNumber` (Task 1), select (Task 3). ✓
- Font size, margin → `PageNumbersOptions.fontSize`/`margin` (Task 2); fixed sensible defaults (12 / 24) supplied by the Panel. The spec lists them as options; they are modeled in the transform but not surfaced as UI controls to keep the panel uncluttered (YAGNI). If you want them user-adjustable, add two inputs in Task 3's Panel — no transform change needed.
- Standard four-file pattern + StandardFonts.Helvetica → Tasks 2–3. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; no "handle edge cases" hand-waving (the invalid-PDF path is implemented and tested). ✓

**Type consistency:** `PageNumberFormat`, `PageNumberPosition` defined in Task 1 and consumed unchanged in Tasks 2–3. `PageNumbersOptions` defined in Task 2, consumed in Task 3 worker + Panel. `addPageNumbers` signature consistent across Tasks 2–3. ✓
