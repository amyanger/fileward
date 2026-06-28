# Watermark, Extract Text & Organize Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three remaining PDF tools from the approved design (`docs/superpowers/specs/2026-06-27-pdf-tools-design.md`): **Watermark**, **Extract Text**, and **Organize Pages** — all 100% client-side.

**Architecture:** Each tool follows Fileward's standard four-file pattern (`transform.ts` pure + dep-injected where it touches pdf.js, `worker.ts` wiring real deps, `Panel.tsx` options UI calling `runTransform`, `transform.test.ts`), registered in `src/tools/registry.tsx` with an icon in `src/components/icons.tsx`. Watermark is pure `pdf-lib` (like `pageNumbers`). Extract Text uses `pdf.js` `getTextContent()` in the worker (like `pdfToImages`). Organize Pages renders thumbnails on the **main thread** via a reusable `src/lib/renderThumbnails.ts` helper, lets the user reorder/rotate/delete in the grid, then saves via a one-shot `pdf-lib` worker call.

**Tech Stack:** TypeScript, React 19, `pdf-lib` (existing), `pdfjs-dist` (existing), Vite worker modules, Vitest + jsdom.

## Global Constraints

- 100% client-side. No network calls anywhere in any transform. (Fileward core guarantee.)
- Reuse the existing tool structure: `transform.ts` (pure), `worker.ts`, `Panel.tsx`, `transform.test.ts`, registered in `src/tools/registry.tsx`.
- No new dependencies. Use existing `pdf-lib` and `pdfjs-dist`.
- `pdf-lib` may be imported directly in `transform.ts` (proven by `mergeSplit`/`imagesToPdf`/`pageNumbers` in jsdom). `pdfjsLib` and DOM/canvas must NOT be imported in `transform.ts` — inject as `deps` so the transform is jsdom-testable.
- Worker created via `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`.
- Reply protocol is `TransformReply` (`{ ok: true, result }` / `{ ok: false, error }`) — post via the cast pattern in `imagesToPdf/worker.ts`.
- pdf.js worker gotchas (Extract Text + thumbnails): set `GlobalWorkerOptions.workerSrc` with `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`; read `file.bytes.byteLength` / copy needed bytes **before** `getDocument` detaches the ArrayBuffer; `runWorker` already ignores pdf.js fake-worker handshake messages (don't change it).
- `ToolResult` shape: `{ outputs: { name, blob }[]; notes?: string[] }`. `ResultView` renders the download button + notes generically.
- Commands: `npm run typecheck`, `npm run lint`, `npx vitest run`, `npm run build`.

---

## TOOL 1 — Watermark

Tool id: `watermark`. Title: `Watermark PDF`. Description: `Overlay text like CONFIDENTIAL across pages.` accept: `application/pdf`.

### Task 1: Pure watermark geometry helpers

**Files:**
- Create: `src/tools/watermark/helpers.ts`
- Test: `src/tools/watermark/helpers.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type WatermarkLayout = 'center' | 'tile'`
  - `centerOrigin(pageW: number, pageH: number, textW: number, fontSize: number, angleDeg: number): { x: number; y: number }`
  - `tileOrigins(pageW: number, pageH: number, stepX: number, stepY: number): { x: number; y: number }[]`

Notes: pdf-lib's origin is bottom-left, y up. `drawText` with `rotate: degrees(angleDeg)` rotates the text about its `(x, y)` baseline origin. For `center`, we approximate centering the rotated text on the page center by stepping the origin back along the text direction by half the text width and half a line height: `x = pageW/2 - cos(θ)*textW/2`, `y = pageH/2 - sin(θ)*textW/2 - fontSize/2` (θ in radians). For `tile`, return a grid of origins from `stepX/2`,`stepY/2` stepping by `stepX`/`stepY` up to the page bounds.

- [ ] **Step 1: Write the failing test**

```ts
// src/tools/watermark/helpers.test.ts
import { describe, it, expect } from 'vitest'
import { centerOrigin, tileOrigins } from './helpers'

describe('centerOrigin', () => {
  it('at 0° centers the baseline horizontally and drops half a line below mid', () => {
    // pageW/2 - textW/2 = 300 - 100 = 200; pageH/2 - 0 - fontSize/2 = 400 - 24 = 376
    expect(centerOrigin(600, 800, 200, 48, 0)).toEqual({ x: 200, y: 376 })
  })
  it('at 90° steps back in y by textW/2', () => {
    // cos90≈0 so x = 300; sin90≈1 so y = 400 - 100 - 24 = 276
    const o = centerOrigin(600, 800, 200, 48, 90)
    expect(o.x).toBeCloseTo(300, 6)
    expect(o.y).toBeCloseTo(276, 6)
  })
})

describe('tileOrigins', () => {
  it('lays a grid starting at half-step, stepping by step within bounds', () => {
    expect(tileOrigins(400, 300, 200, 150)).toEqual([
      { x: 100, y: 75 },
      { x: 300, y: 75 },
      { x: 100, y: 225 },
      { x: 300, y: 225 },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/watermark/helpers.test.ts`
Expected: FAIL — cannot resolve `./helpers`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/tools/watermark/helpers.ts
export type WatermarkLayout = 'center' | 'tile'

export function centerOrigin(
  pageW: number,
  pageH: number,
  textW: number,
  fontSize: number,
  angleDeg: number,
): { x: number; y: number } {
  const t = (angleDeg * Math.PI) / 180
  return {
    x: pageW / 2 - (Math.cos(t) * textW) / 2,
    y: pageH / 2 - (Math.sin(t) * textW) / 2 - fontSize / 2,
  }
}

export function tileOrigins(
  pageW: number,
  pageH: number,
  stepX: number,
  stepY: number,
): { x: number; y: number }[] {
  const origins: { x: number; y: number }[] = []
  for (let y = stepY / 2; y < pageH; y += stepY) {
    for (let x = stepX / 2; x < pageW; x += stepX) {
      origins.push({ x, y })
    }
  }
  return origins
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tools/watermark/helpers.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/watermark/helpers.ts src/tools/watermark/helpers.test.ts
git commit -m "feat(watermark): pure geometry helpers for center/tile layout"
```

### Task 2: Watermark transform + test

**Files:**
- Create: `src/tools/watermark/transform.ts`
- Test: `src/tools/watermark/transform.test.ts`

**Interfaces:**
- Consumes: `centerOrigin`, `tileOrigins`, `WatermarkLayout` from `./helpers`.
- Produces:
  - `interface WatermarkOptions { text: string; opacity: number; angle: number; fontSize: number; layout: WatermarkLayout }`
  - `addWatermark(files: InputFile[], opts: WatermarkOptions): Promise<ToolResult>`

Per-file loop mirrors `pageNumbers/transform.ts`: load with `PDFDocument.load`, embed Helvetica, draw on every page, push `${base}-watermarked.pdf`, catch → `notes`. Tile step is derived from font size so dense text tiles tighter: `stepX = fontSize * 8`, `stepY = fontSize * 5`.

- [ ] **Step 1: Write the failing test**

```ts
// src/tools/watermark/transform.test.ts
import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { addWatermark } from './transform'
import type { InputFile } from '../../types'

async function makePdf(pages: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([300, 400])
  const bytes = await doc.save()
  // pdf-lib save() returns a Uint8Array over a fresh buffer (byteOffset 0).
  // `as ArrayBuffer` matches the proven pageNumbers test — slice() is typed
  // ArrayBufferLike, which fails strict `tsc -b` against InputFile.bytes.
  return bytes.buffer.slice(0) as ArrayBuffer
}

function asInput(buf: ArrayBuffer, name = 'a.pdf'): InputFile {
  return { id: '1', name, bytes: buf, type: 'application/pdf' }
}

describe('addWatermark', () => {
  it('produces one watermarked pdf per input, preserving page count', async () => {
    const res = await addWatermark([asInput(await makePdf(3))], {
      text: 'CONFIDENTIAL', opacity: 0.15, angle: 45, fontSize: 24, layout: 'center',
    })
    expect(res.outputs).toHaveLength(1)
    expect(res.outputs[0].name).toBe('a-watermarked.pdf')
    const out = await PDFDocument.load(await res.outputs[0].blob.arrayBuffer())
    expect(out.getPageCount()).toBe(3)
  })

  it('tile layout also yields a valid pdf', async () => {
    const res = await addWatermark([asInput(await makePdf(1), 'b.pdf')], {
      text: 'DRAFT', opacity: 0.2, angle: 30, fontSize: 18, layout: 'tile',
    })
    const out = await PDFDocument.load(await res.outputs[0].blob.arrayBuffer())
    expect(out.getPageCount()).toBe(1)
  })

  it('records a note and skips an unreadable file', async () => {
    const bad = new TextEncoder().encode('not a pdf')
    const res = await addWatermark([asInput(bad.buffer, 'bad.pdf')], {
      text: 'X', opacity: 0.15, angle: 45, fontSize: 24, layout: 'center',
    })
    expect(res.outputs).toHaveLength(0)
    expect(res.notes?.[0]).toContain('bad.pdf')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/watermark/transform.test.ts`
Expected: FAIL — cannot resolve `./transform`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/tools/watermark/transform.ts
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import type { InputFile, ToolResult } from '../../types'
import { centerOrigin, tileOrigins, type WatermarkLayout } from './helpers'

export interface WatermarkOptions {
  text: string
  opacity: number
  angle: number
  fontSize: number
  layout: WatermarkLayout
}

export async function addWatermark(
  files: InputFile[],
  opts: WatermarkOptions,
): Promise<ToolResult> {
  const outputs = []
  const notes: string[] = []
  for (const file of files) {
    const base = file.name.replace(/\.[^.]+$/, '')
    try {
      const doc = await PDFDocument.load(new Uint8Array(file.bytes))
      const font = await doc.embedFont(StandardFonts.Helvetica)
      const textW = font.widthOfTextAtSize(opts.text, opts.fontSize)
      const common = {
        size: opts.fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity: opts.opacity,
        rotate: degrees(opts.angle),
      }
      for (const page of doc.getPages()) {
        const { width, height } = page.getSize()
        if (opts.layout === 'tile') {
          for (const o of tileOrigins(width, height, opts.fontSize * 8, opts.fontSize * 5)) {
            page.drawText(opts.text, { x: o.x, y: o.y, ...common })
          }
        } else {
          const o = centerOrigin(width, height, textW, opts.fontSize, opts.angle)
          page.drawText(opts.text, { x: o.x, y: o.y, ...common })
        }
      }
      const saved = await doc.save()
      outputs.push({
        name: `${base}-watermarked.pdf`,
        blob: new Blob([new Uint8Array(saved)], { type: 'application/pdf' }),
      })
    } catch (err) {
      notes.push(`Skipped ${file.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return { outputs, notes: notes.length ? notes : undefined }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tools/watermark/transform.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/watermark/transform.ts src/tools/watermark/transform.test.ts
git commit -m "feat(watermark): pure transform drawing text watermark per page"
```

### Task 3: Watermark worker + Panel + registry + icon

**Files:**
- Create: `src/tools/watermark/worker.ts`
- Create: `src/tools/watermark/Panel.tsx`
- Modify: `src/tools/registry.tsx`
- Modify: `src/components/icons.tsx`

**Interfaces:**
- Consumes: `addWatermark`, `WatermarkOptions` from `./transform`; `PanelProps` from `../../components/ToolPage`; `runTransform` from `../../lib/runWorker`.
- Produces: `WatermarkPanel` React component; new `TOOLS` entry id `watermark`.

- [ ] **Step 1: Create the worker**

```ts
// src/tools/watermark/worker.ts
import type { TransformMessage, TransformReply } from '../../types'
import { addWatermark, type WatermarkOptions } from './transform'

self.onmessage = async (e: MessageEvent<TransformMessage<WatermarkOptions>>) => {
  try {
    const result = await addWatermark(e.data.files, e.data.options)
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
// src/tools/watermark/Panel.tsx
import { useState } from 'react'
import { runTransform } from '../../lib/runWorker'
import type { PanelProps } from '../../components/ToolPage'
import type { WatermarkOptions } from './transform'

export function WatermarkPanel({ files, busy, onRun }: PanelProps) {
  const [text, setText] = useState('CONFIDENTIAL')
  const [layout, setLayout] = useState<WatermarkOptions['layout']>('center')
  const [angle, setAngle] = useState(45)
  const [fontSize, setFontSize] = useState(48)
  const [opacity, setOpacity] = useState(0.15)
  const makeWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  return (
    <div className="space-y-3">
      <label className="field-label">
        Watermark text
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="field-input"
        />
      </label>
      <label className="field-label">
        Layout
        <select
          value={layout}
          onChange={(e) => setLayout(e.target.value as WatermarkOptions['layout'])}
          className="field-input"
        >
          <option value="center">Single (centered)</option>
          <option value="tile">Tiled</option>
        </select>
      </label>
      <label className="field-label">
        Angle: {angle}°
        <input
          type="range" min={0} max={90} step={5}
          value={angle}
          onChange={(e) => setAngle(Number(e.target.value))}
          className="field-input"
        />
      </label>
      <label className="field-label">
        Font size: {fontSize}
        <input
          type="range" min={12} max={96} step={2}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="field-input"
        />
      </label>
      <label className="field-label">
        Opacity: {opacity.toFixed(2)}
        <input
          type="range" min={0.05} max={0.6} step={0.05}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="field-input"
        />
      </label>
      <button
        disabled={busy || files.length === 0 || text.trim() === ''}
        onClick={() =>
          onRun(() =>
            runTransform<WatermarkOptions>(makeWorker, {
              files,
              options: { text: text.trim(), opacity, angle, fontSize, layout },
            }),
          )
        }
        className="btn-primary"
      >
        {busy ? 'Working…' : 'Add watermark'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Register the tool**

In `src/tools/registry.tsx`, add the import near the other panel imports:

```tsx
import { WatermarkPanel } from './watermark/Panel'
```

And add this entry to the `TOOLS` array, after the `page-numbers` entry:

```tsx
  {
    def: { id: 'watermark', title: 'Watermark PDF', description: 'Overlay text like CONFIDENTIAL across pages.', accept: 'application/pdf' },
    renderPanel: (p) => <WatermarkPanel {...p} />,
  },
```

- [ ] **Step 4: Add the icon**

In `src/components/icons.tsx`, add to the `ToolGlyphs` object after the `page-numbers` glyph:

```tsx
  watermark: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
      <path d="M7.5 16 16.5 7" />
      <path d="M9 9.5h2M13 14.5h2" />
    </>
  ),
```

- [ ] **Step 5: Verify typecheck, lint, tests, build**

Run: `npm run typecheck && npm run lint && npx vitest run && npm run build`
Expected: all pass; `watermark` appears in the tool hub.

- [ ] **Step 6: Commit**

```bash
git add src/tools/watermark/worker.ts src/tools/watermark/Panel.tsx src/tools/registry.tsx src/components/icons.tsx
git commit -m "feat(watermark): worker, panel, registry entry, and icon"
```

---

## TOOL 2 — Extract Text

Tool id: `extract-text`. Title: `Extract Text`. Description: `Pull selectable text out of a PDF to a .txt file.` accept: `application/pdf`.

### Task 4: Extract Text transform + test (dep-injected pdf.js)

**Files:**
- Create: `src/tools/extractText/transform.ts`
- Test: `src/tools/extractText/transform.test.ts`

**Interfaces:**
- Consumes: nothing from this tool yet.
- Produces:
  - `interface ExtractTextOptions { pageBreaks: boolean }`
  - `interface ExtractTextDeps { extractPages(bytes: ArrayBuffer): Promise<string[]> }` — returns one trimmed string per page (text layer joined).
  - `extractText(files: InputFile[], opts: ExtractTextOptions, deps: ExtractTextDeps): Promise<ToolResult>`

Behavior: for each file, call `deps.extractPages`. Join pages with `'\n\n'` always, but when `pageBreaks` is true insert a `\f` form-feed separator line (`\n\n----- Page N -----\n\n`) between pages. If the joined text is empty/whitespace (scanned PDF), push **no output** for that file and add the note `No selectable text found in <name> — this looks like a scanned PDF.`. Output name `${base}.txt`, blob type `text/plain`.

- [ ] **Step 1: Write the failing test**

```ts
// src/tools/extractText/transform.test.ts
import { describe, it, expect } from 'vitest'
import { extractText, type ExtractTextDeps } from './transform'
import type { InputFile } from '../../types'

const input: InputFile = { id: '1', name: 'doc.pdf', bytes: new ArrayBuffer(8), type: 'application/pdf' }

function depsReturning(pages: string[]): ExtractTextDeps {
  return { extractPages: async () => pages }
}

describe('extractText', () => {
  it('joins pages with blank lines when pageBreaks is false', async () => {
    const res = await extractText([input], { pageBreaks: false }, depsReturning(['one', 'two']))
    expect(res.outputs).toHaveLength(1)
    expect(res.outputs[0].name).toBe('doc.txt')
    expect(await res.outputs[0].blob.text()).toBe('one\n\ntwo')
  })

  it('inserts page separators when pageBreaks is true', async () => {
    const res = await extractText([input], { pageBreaks: true }, depsReturning(['one', 'two']))
    expect(await res.outputs[0].blob.text()).toBe('one\n\n----- Page 2 -----\n\ntwo')
  })

  it('emits a scanned-pdf note and no output when there is no text', async () => {
    const res = await extractText([input], { pageBreaks: false }, depsReturning(['', '   ']))
    expect(res.outputs).toHaveLength(0)
    expect(res.notes?.[0]).toContain('scanned PDF')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/extractText/transform.test.ts`
Expected: FAIL — cannot resolve `./transform`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/tools/extractText/transform.ts
import type { InputFile, ToolResult } from '../../types'

export interface ExtractTextOptions {
  pageBreaks: boolean
}

export interface ExtractTextDeps {
  extractPages(bytes: ArrayBuffer): Promise<string[]>
}

export async function extractText(
  files: InputFile[],
  opts: ExtractTextOptions,
  deps: ExtractTextDeps,
): Promise<ToolResult> {
  const outputs = []
  const notes: string[] = []
  for (const file of files) {
    const base = file.name.replace(/\.[^.]+$/, '')
    try {
      const pages = await deps.extractPages(file.bytes)
      const text = pages
        .map((p, i) =>
          opts.pageBreaks && i > 0 ? `----- Page ${i + 1} -----\n\n${p}` : p,
        )
        .join('\n\n')
      if (text.trim() === '') {
        notes.push(`No selectable text found in ${file.name} — this looks like a scanned PDF.`)
        continue
      }
      outputs.push({ name: `${base}.txt`, blob: new Blob([text], { type: 'text/plain' }) })
    } catch (err) {
      notes.push(`Skipped ${file.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return { outputs, notes: notes.length ? notes : undefined }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tools/extractText/transform.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/extractText/transform.ts src/tools/extractText/transform.test.ts
git commit -m "feat(extract-text): pure transform joining page text with optional breaks"
```

### Task 5: Extract Text worker + Panel + registry + icon

**Files:**
- Create: `src/tools/extractText/worker.ts`
- Create: `src/tools/extractText/Panel.tsx`
- Modify: `src/tools/registry.tsx`
- Modify: `src/components/icons.tsx`

**Interfaces:**
- Consumes: `extractText`, `ExtractTextOptions`, `ExtractTextDeps` from `./transform`; pdf.js `getDocument`/`getTextContent`; `PanelProps`; `runTransform`.
- Produces: `ExtractTextPanel`; `TOOLS` entry id `extract-text`.

pdf.js text items: `getTextContent()` returns `{ items }` where text items have a `str` field (TS type `TextItem | TextMarkedContent`; guard with `'str' in item`). Join a page's `str` values with spaces; trim. Read nothing else from `file.bytes` after `getDocument` (it detaches) — we don't need to here.

- [ ] **Step 1: Create the worker**

```ts
// src/tools/extractText/worker.ts
import * as pdfjsLib from 'pdfjs-dist'
import type { TransformMessage, TransformReply } from '../../types'
import { extractText, type ExtractTextOptions, type ExtractTextDeps } from './transform'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const deps: ExtractTextDeps = {
  async extractPages(bytes) {
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise
    const pages: string[] = []
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const content = await page.getTextContent()
      const text = content.items
        .map((it) => ('str' in it ? it.str : ''))
        .join(' ')
        .replace(/[ \t]+/g, ' ')
        .trim()
      pages.push(text)
    }
    await doc.cleanup()
    return pages
  },
}

self.onmessage = async (e: MessageEvent<TransformMessage<ExtractTextOptions>>) => {
  try {
    const result = await extractText(e.data.files, e.data.options, deps)
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
// src/tools/extractText/Panel.tsx
import { useState } from 'react'
import { runTransform } from '../../lib/runWorker'
import type { PanelProps } from '../../components/ToolPage'
import type { ExtractTextOptions } from './transform'

export function ExtractTextPanel({ files, busy, onRun }: PanelProps) {
  const [pageBreaks, setPageBreaks] = useState(true)
  const makeWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={pageBreaks}
          onChange={(e) => setPageBreaks(e.target.checked)}
        />
        Mark page breaks in the text
      </label>
      <button
        disabled={busy || files.length === 0}
        onClick={() =>
          onRun(() =>
            runTransform<ExtractTextOptions>(makeWorker, { files, options: { pageBreaks } }),
          )
        }
        className="btn-primary"
      >
        {busy ? 'Working…' : 'Extract text'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Register the tool**

In `src/tools/registry.tsx`, add the import:

```tsx
import { ExtractTextPanel } from './extractText/Panel'
```

And add this entry to `TOOLS`, after the `watermark` entry:

```tsx
  {
    def: { id: 'extract-text', title: 'Extract Text', description: 'Pull selectable text out of a PDF to a .txt file.', accept: 'application/pdf' },
    renderPanel: (p) => <ExtractTextPanel {...p} />,
  },
```

- [ ] **Step 4: Add the icon**

In `src/components/icons.tsx`, add to `ToolGlyphs` after the `watermark` glyph:

```tsx
  'extract-text': (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
      <path d="M8.5 8h7M8.5 11h7M8.5 14h4" />
    </>
  ),
```

- [ ] **Step 5: Verify typecheck, lint, tests, build**

Run: `npm run typecheck && npm run lint && npx vitest run && npm run build`
Expected: all pass.

- [ ] **Step 6: Manual check in Safari (uncovered seam: real pdf.js)**

Run `npm run dev`, open in Safari, load a text-based PDF in **Extract Text** → confirm a `.txt` downloads with the text. Load a scanned/image-only PDF → confirm the "scanned PDF" note appears and no empty file downloads.

- [ ] **Step 7: Commit**

```bash
git add src/tools/extractText/worker.ts src/tools/extractText/Panel.tsx src/tools/registry.tsx src/components/icons.tsx
git commit -m "feat(extract-text): worker, panel, registry entry, and icon"
```

---

## TOOL 3 — Organize Pages

Tool id: `organize-pages`. Title: `Organize Pages`. Description: `Reorder, rotate, and delete PDF pages.` accept: `application/pdf`.

This tool diverges from the standard flow: its thumbnail grid **is** the options UI. Thumbnails render on the **main thread** (pdf.js uses its own real worker there — fast, no fake-worker problem). Saving is a one-shot `pdf-lib` worker call. It operates on a **single** PDF (the first file).

### Task 6: Pure page-op transform + test

**Files:**
- Create: `src/tools/organizePages/transform.ts`
- Test: `src/tools/organizePages/transform.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface PageOp { srcPageIndex: number; rotation: number }` (`rotation` in degrees, multiple of 90)
  - `interface OrganizePagesOptions { ops: PageOp[] }`
  - `organizePages(files: InputFile[], opts: OrganizePagesOptions): Promise<ToolResult>`

Behavior: use the **first** file only. If `ops` is empty, throw `Error('No pages selected — add at least one page.')`. Create a new `PDFDocument`, `copyPages(src, ops.map(o => o.srcPageIndex))`, add each copied page, apply `page.setRotation(degrees(baseRotation + op.rotation))` where `baseRotation` is the source page's existing rotation angle (so rotations compose). Output name `${base}-organized.pdf`.

- [ ] **Step 1: Write the failing test**

```ts
// src/tools/organizePages/transform.test.ts
import { describe, it, expect } from 'vitest'
import { PDFDocument, degrees } from 'pdf-lib'
import { organizePages } from './transform'
import type { InputFile } from '../../types'

async function makePdf(pages: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([300, 400])
  const bytes = await doc.save()
  // `as ArrayBuffer`: slice() is typed ArrayBufferLike and fails strict tsc -b.
  return bytes.buffer.slice(0) as ArrayBuffer
}

function asInput(buf: ArrayBuffer): InputFile {
  return { id: '1', name: 'a.pdf', bytes: buf, type: 'application/pdf' }
}

describe('organizePages', () => {
  it('reorders and drops pages per ops', async () => {
    const res = await organizePages([asInput(await makePdf(3))], {
      ops: [{ srcPageIndex: 2, rotation: 0 }, { srcPageIndex: 0, rotation: 0 }],
    })
    const out = await PDFDocument.load(await res.outputs[0].blob.arrayBuffer())
    expect(out.getPageCount()).toBe(2)
    expect(res.outputs[0].name).toBe('a-organized.pdf')
  })

  it('applies rotation to a copied page', async () => {
    const res = await organizePages([asInput(await makePdf(1))], {
      ops: [{ srcPageIndex: 0, rotation: 90 }],
    })
    const out = await PDFDocument.load(await res.outputs[0].blob.arrayBuffer())
    expect(out.getPage(0).getRotation().angle).toBe(degrees(90).angle)
  })

  it('throws when no pages are selected', async () => {
    await expect(
      organizePages([asInput(await makePdf(2))], { ops: [] }),
    ).rejects.toThrow('No pages selected')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/organizePages/transform.test.ts`
Expected: FAIL — cannot resolve `./transform`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/tools/organizePages/transform.ts
import { PDFDocument, degrees } from 'pdf-lib'
import type { InputFile, ToolResult } from '../../types'

export interface PageOp {
  srcPageIndex: number
  rotation: number
}

export interface OrganizePagesOptions {
  ops: PageOp[]
}

export async function organizePages(
  files: InputFile[],
  opts: OrganizePagesOptions,
): Promise<ToolResult> {
  if (opts.ops.length === 0) throw new Error('No pages selected — add at least one page.')
  const file = files[0]
  const base = file.name.replace(/\.[^.]+$/, '')
  const src = await PDFDocument.load(new Uint8Array(file.bytes))
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, opts.ops.map((o) => o.srcPageIndex))
  copied.forEach((page, i) => {
    const baseAngle = page.getRotation().angle
    page.setRotation(degrees(baseAngle + opts.ops[i].rotation))
    out.addPage(page)
  })
  const saved = await out.save()
  return {
    outputs: [
      {
        name: `${base}-organized.pdf`,
        blob: new Blob([new Uint8Array(saved)], { type: 'application/pdf' }),
      },
    ],
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tools/organizePages/transform.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/organizePages/transform.ts src/tools/organizePages/transform.test.ts
git commit -m "feat(organize-pages): pure reorder/rotate/delete transform"
```

### Task 7: Reusable main-thread thumbnail helper

**Files:**
- Create: `src/lib/renderThumbnails.ts`

**Interfaces:**
- Consumes: pdf.js `getDocument`.
- Produces:
  - `async function* renderThumbnails(bytes: ArrayBuffer, maxWidth?: number): AsyncGenerator<{ index: number; dataUrl: string }>`

Notes: runs on the main thread (DOM `document.createElement('canvas')`, real pdf.js worker). Set `GlobalWorkerOptions.workerSrc` once (module-level). Copy the bytes into a fresh `Uint8Array` before `getDocument` so callers keep their buffer. Yields each page's PNG data URL as it renders so the grid can populate progressively. `maxWidth` defaults to `180`; scale = `maxWidth / viewport(scale 1).width`.

No automated test (DOM canvas + real pdf.js is the same uncovered seam as `pdfToImages`'s real worker — verified manually in Task 9). This helper has a single clear responsibility and is exercised by the Panel.

- [ ] **Step 1: Create the helper**

```ts
// src/lib/renderThumbnails.ts
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export async function* renderThumbnails(
  bytes: ArrayBuffer,
  maxWidth = 180,
): AsyncGenerator<{ index: number; dataUrl: string }> {
  const data = new Uint8Array(bytes.slice(0))
  const doc = await pdfjsLib.getDocument({ data }).promise
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const unit = page.getViewport({ scale: 1 })
    const scale = maxWidth / unit.width
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    yield { index: p - 1, dataUrl: canvas.toDataURL('image/png') }
  }
  await doc.cleanup()
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: PASS (no usages yet, just compiles).

- [ ] **Step 3: Commit**

```bash
git add src/lib/renderThumbnails.ts
git commit -m "feat(lib): main-thread pdf.js thumbnail generator"
```

### Task 8: Organize Pages worker + interactive Panel + registry + icon

**Files:**
- Create: `src/tools/organizePages/worker.ts`
- Create: `src/tools/organizePages/Panel.tsx`
- Modify: `src/tools/registry.tsx`
- Modify: `src/components/icons.tsx`

**Interfaces:**
- Consumes: `organizePages`, `OrganizePagesOptions`, `PageOp` from `./transform`; `renderThumbnails` from `../../lib/renderThumbnails`; `PanelProps`; `runTransform`.
- Produces: `OrganizePagesPanel`; `TOOLS` entry id `organize-pages`.

Panel state: `thumbs: { index: number; dataUrl: string }[]` (source pages, fixed) and `ops: PageOp[]` (ordered working set, each `{ srcPageIndex, rotation }`). On `files[0]` change, reset and stream thumbnails into `thumbs`, seeding `ops` to identity order. Controls per card: move-left / move-right (reorder), rotate (+90 mod 360), delete (remove from `ops`). Run is disabled when `ops` is empty. Uses native buttons for reorder (no drag-drop dependency — simpler and keyboard-accessible).

- [ ] **Step 1: Create the worker**

```ts
// src/tools/organizePages/worker.ts
import type { TransformMessage, TransformReply } from '../../types'
import { organizePages, type OrganizePagesOptions } from './transform'

self.onmessage = async (e: MessageEvent<TransformMessage<OrganizePagesOptions>>) => {
  try {
    const result = await organizePages(e.data.files, e.data.options)
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
```

- [ ] **Step 3: Register the tool**

In `src/tools/registry.tsx`, add the import:

```tsx
import { OrganizePagesPanel } from './organizePages/Panel'
```

And add this entry to `TOOLS`. Place it **first** (it is the headline editor), before the `merge-split` entry:

```tsx
  {
    def: { id: 'organize-pages', title: 'Organize Pages', description: 'Reorder, rotate, and delete PDF pages.', accept: 'application/pdf' },
    renderPanel: (p) => <OrganizePagesPanel {...p} />,
  },
```

- [ ] **Step 4: Add the icon**

In `src/components/icons.tsx`, add to `ToolGlyphs` after the `extract-text` glyph:

```tsx
  'organize-pages': (
    <>
      <rect x="3.5" y="6" width="7" height="9" rx="1.2" />
      <rect x="13.5" y="9" width="7" height="9" rx="1.2" />
      <path d="M7 18.5v1M17 4.5v1" />
    </>
  ),
```

- [ ] **Step 5: Verify typecheck, lint, tests, build**

Run: `npm run typecheck && npm run lint && npx vitest run && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/tools/organizePages/worker.ts src/tools/organizePages/Panel.tsx src/tools/registry.tsx src/components/icons.tsx
git commit -m "feat(organize-pages): worker, interactive thumbnail panel, registry, icon"
```

### Task 9: Manual verification of the rendering seam

**Files:** none (manual).

The two uncovered seams — `renderThumbnails` (real pdf.js + DOM canvas, main thread) and `runWorker` + real pdf.js for Extract Text — must be exercised in a browser.

- [ ] **Step 1: Run the dev server and verify in Safari**

Run: `npm run dev`, open the printed URL in **Safari**.

Verify:
- **Organize Pages:** load a multi-page PDF → thumbnails appear progressively; move/rotate/delete update the grid; Save downloads a PDF reflecting the new order/rotation/removals. Deleting all pages disables Save.
- **Watermark:** centered and tiled both render with the chosen text/angle/opacity.
- **Extract Text:** text PDF → `.txt` with the content; scanned PDF → the "scanned PDF" note, no empty file.

- [ ] **Step 2: Commit any fixes found, otherwise note completion**

If a fix was needed, commit it with a `fix:` message. Otherwise no commit — verification only.

---

## Self-Review notes

- **Spec coverage:** Watermark (text/opacity/angle/font/layout) → Tasks 1–3. Extract Text (page-break option, scanned-PDF message, `.txt` download) → Tasks 4–5. Organize Pages (thumbnail grid, reorder/rotate/delete, empty guard, `renderThumbnails` helper) → Tasks 6–8. Manual seam check → Task 9.
- **Deviation from spec, intentional:** Extract Text uses the standard `ResultView` `.txt` download rather than an in-Panel copy-to-clipboard preview (YAGNI; keeps the four-file pattern intact). Organize Pages uses move-left/right buttons instead of drag-and-drop (no new dependency; keyboard-accessible). Both preserve the spec's user-facing capability.
- **Out of scope (unchanged):** password protect/unlock, OCR, unified editor.
