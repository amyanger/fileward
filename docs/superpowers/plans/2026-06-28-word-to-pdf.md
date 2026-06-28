# Word to PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `word-to-pdf` Fileward tool that converts `.docx` files to PDF entirely client-side, with two modes: selectable-text (default) and pixel-faithful image.

**Architecture:** A main-thread tool (the app's first deliberate non-worker tool — both pipelines need the DOM). A pure `transform.ts` orchestrator takes injected `deps` for the browser-only heavy lifting (mammoth, docx-preview, html2canvas); pure helpers handle HTML→blocks parsing and pdf-lib layout. `deps.ts` wires the real libraries via dynamic `import()` and exposes `convertWordToPdf(files, options)`, which the Panel calls directly through the existing `onRun(() => Promise<ToolResult>)` contract.

**Tech Stack:** Vite + React 19 + TypeScript, `pdf-lib` (already present), new deps `mammoth`, `docx-preview`, `html2canvas`. Tests: Vitest + jsdom.

## Global Constraints

- **100% client-side, zero network calls** — never add a fetch/XHR to any conversion path. Preserve the offline guarantee.
- **`.docx` only** — reject anything else (legacy `.doc`, non-zip) with a note; never throw on it.
- **Main-thread tool** — this tool has **no `worker.ts`**. The Panel calls `convertWordToPdf` directly.
- **Dep-injection** — `transform.ts` stays pure and testable: heavy/browser deps come in as a third `deps` argument (mirror `extractText/transform.ts`). No direct `mammoth`/`docx-preview`/`html2canvas`/DOM calls in `transform.ts`.
- **Per-file resilience** — wrap each file in `try/catch`; collect failures/skips in `notes`, never throw out of the loop.
- **Default mode is `text`.** Default paper size `letter`. Default image scale `2`.
- **Lazy-load** the three new libs via dynamic `import()` inside `deps.ts` so they only load when the tool runs.
- Package manager is **npm**. Test runner is **vitest** (`npx vitest run`).

---

### Task 1: Helpers foundation — deps install, `isDocx`, page sizes

**Files:**
- Modify: `package.json` (add deps)
- Create: `src/tools/wordToPdf/helpers.ts`
- Test: `src/tools/wordToPdf/helpers.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type PaperSize = 'a4' | 'letter'`; `const PAGE_SIZES: Record<PaperSize, [number, number]>`; `function isDocx(bytes: ArrayBuffer): boolean`.

- [ ] **Step 1: Install the three client-side libraries**

Run:
```bash
npm install mammoth docx-preview html2canvas
```
Expected: installs succeed; `package.json` dependencies now include `mammoth`, `docx-preview`, `html2canvas`.

- [ ] **Step 2: Write the failing test**

Create `src/tools/wordToPdf/helpers.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isDocx, PAGE_SIZES } from './helpers'

function bytesOf(...nums: number[]): ArrayBuffer {
  return new Uint8Array(nums).buffer
}

describe('isDocx', () => {
  it('accepts a zip (PK\\x03\\x04) signature', () => {
    expect(isDocx(bytesOf(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00))).toBe(true)
  })
  it('rejects a legacy .doc OLE header', () => {
    expect(isDocx(bytesOf(0xd0, 0xcf, 0x11, 0xe0))).toBe(false)
  })
  it('rejects input shorter than 4 bytes', () => {
    expect(isDocx(bytesOf(0x50, 0x4b))).toBe(false)
  })
})

describe('PAGE_SIZES', () => {
  it('uses US Letter points', () => {
    expect(PAGE_SIZES.letter).toEqual([612, 792])
  })
  it('uses A4 points', () => {
    expect(PAGE_SIZES.a4).toEqual([595.28, 841.89])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/tools/wordToPdf/helpers.test.ts`
Expected: FAIL — cannot resolve `./helpers`.

- [ ] **Step 4: Write minimal implementation**

Create `src/tools/wordToPdf/helpers.ts`:
```ts
export type PaperSize = 'a4' | 'letter'

/** Page dimensions in PDF points (1pt = 1/72in). */
export const PAGE_SIZES: Record<PaperSize, [number, number]> = {
  letter: [612, 792],
  a4: [595.28, 841.89],
}

/** A .docx is a zip; zips start with the local-file-header magic "PK\x03\x04". */
export function isDocx(bytes: ArrayBuffer): boolean {
  if (bytes.byteLength < 4) return false
  const b = new Uint8Array(bytes, 0, 4)
  return b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/tools/wordToPdf/helpers.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/tools/wordToPdf/helpers.ts src/tools/wordToPdf/helpers.test.ts
git commit -m "feat(word-to-pdf): helpers foundation — isDocx, page sizes, deps"
```

---

### Task 2: HTML → blocks parser (`parseBlocks`)

**Files:**
- Modify: `src/tools/wordToPdf/helpers.ts`
- Test: `src/tools/wordToPdf/helpers.test.ts`

**Interfaces:**
- Consumes: `DOMParser` (jsdom in tests, browser at runtime).
- Produces:
  - `interface Run { text: string; bold: boolean; italic: boolean }`
  - `type Block = { type: 'heading'; level: 1 | 2 | 3; runs: Run[] } | { type: 'paragraph'; runs: Run[] } | { type: 'listitem'; marker: string; runs: Run[] } | { type: 'image'; dataUrl: string }`
  - `function parseBlocks(html: string): Block[]`

- [ ] **Step 1: Write the failing test**

Append to `src/tools/wordToPdf/helpers.test.ts`:
```ts
import { parseBlocks } from './helpers'

describe('parseBlocks', () => {
  it('maps headings and paragraphs with bold/italic runs', () => {
    const blocks = parseBlocks('<h1>Title</h1><p>Hello <strong>bold</strong> <em>it</em></p>')
    expect(blocks[0]).toEqual({ type: 'heading', level: 1, runs: [{ text: 'Title', bold: false, italic: false }] })
    expect(blocks[1].type).toBe('paragraph')
    const runs = (blocks[1] as { runs: { text: string; bold: boolean; italic: boolean }[] }).runs
    expect(runs.some((r) => r.text.includes('bold') && r.bold)).toBe(true)
    expect(runs.some((r) => r.text.includes('it') && r.italic)).toBe(true)
  })

  it('numbers ordered lists and bullets unordered lists', () => {
    const ol = parseBlocks('<ol><li>a</li><li>b</li></ol>')
    expect(ol.map((b) => (b as { marker: string }).marker)).toEqual(['1.', '2.'])
    const ul = parseBlocks('<ul><li>x</li></ul>')
    expect((ul[0] as { marker: string }).marker).toBe('•')
  })

  it('emits an image block from a data-url img', () => {
    const blocks = parseBlocks('<p><img src="data:image/png;base64,AAAA"></p>')
    expect(blocks[0]).toEqual({ type: 'image', dataUrl: 'data:image/png;base64,AAAA' })
  })

  it('flattens table rows into paragraphs', () => {
    const blocks = parseBlocks('<table><tr><td>a</td><td>b</td></tr></table>')
    expect(blocks[0].type).toBe('paragraph')
    expect((blocks[0] as { runs: { text: string }[] }).runs[0].text).toBe('a   b')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/wordToPdf/helpers.test.ts`
Expected: FAIL — `parseBlocks` is not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/tools/wordToPdf/helpers.ts`:
```ts
export interface Run {
  text: string
  bold: boolean
  italic: boolean
}

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; runs: Run[] }
  | { type: 'paragraph'; runs: Run[] }
  | { type: 'listitem'; marker: string; runs: Run[] }
  | { type: 'image'; dataUrl: string }

function collectRuns(node: Node, bold: boolean, italic: boolean, out: Run[]): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3) {
      const text = (child.textContent ?? '').replace(/\s+/g, ' ')
      if (text) out.push({ text, bold, italic })
    } else if (child.nodeType === 1) {
      const tag = (child as Element).tagName.toLowerCase()
      collectRuns(child, bold || tag === 'strong' || tag === 'b', italic || tag === 'em' || tag === 'i', out)
    }
  }
}

function runsOf(el: Element): Run[] {
  const out: Run[] = []
  collectRuns(el, false, false, out)
  return out
}

function walk(root: Element, out: Block[]): void {
  for (const el of Array.from(root.children)) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      out.push({ type: 'heading', level: Number(tag[1]) as 1 | 2 | 3, runs: runsOf(el) })
    } else if (tag === 'p') {
      const img = el.querySelector('img')
      const src = img?.getAttribute('src')
      if (src) out.push({ type: 'image', dataUrl: src })
      const runs = runsOf(el)
      if (runs.some((r) => r.text.trim())) out.push({ type: 'paragraph', runs })
    } else if (tag === 'ul' || tag === 'ol') {
      let n = 1
      for (const li of Array.from(el.children)) {
        if (li.tagName.toLowerCase() !== 'li') continue
        out.push({ type: 'listitem', marker: tag === 'ol' ? `${n++}.` : '•', runs: runsOf(li) })
      }
    } else if (tag === 'img') {
      const src = el.getAttribute('src')
      if (src) out.push({ type: 'image', dataUrl: src })
    } else if (tag === 'table') {
      for (const tr of Array.from(el.querySelectorAll('tr'))) {
        const cells = Array.from(tr.children)
          .map((td) => (td.textContent ?? '').trim())
          .filter(Boolean)
        if (cells.length) out.push({ type: 'paragraph', runs: [{ text: cells.join('   '), bold: false, italic: false }] })
      }
    } else {
      walk(el, out) // recurse into wrappers (div, section, article, …)
    }
  }
}

export function parseBlocks(html: string): Block[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const blocks: Block[] = []
  walk(doc.body, blocks)
  return blocks
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tools/wordToPdf/helpers.test.ts`
Expected: PASS (all `parseBlocks` tests green plus Task 1's).

- [ ] **Step 5: Commit**

```bash
git add src/tools/wordToPdf/helpers.ts src/tools/wordToPdf/helpers.test.ts
git commit -m "feat(word-to-pdf): parse mammoth HTML into layout blocks"
```

---

### Task 3: pdf-lib builders (`layoutTextPdf`, `buildImagePdf`)

**Files:**
- Modify: `src/tools/wordToPdf/helpers.ts`
- Test: `src/tools/wordToPdf/helpers.test.ts`

**Interfaces:**
- Consumes: `parseBlocks`, `PAGE_SIZES`, `PaperSize` (Tasks 1–2); `pdf-lib`.
- Produces:
  - `function layoutTextPdf(html: string, paperSize: PaperSize): Promise<Uint8Array>`
  - `interface RasterPage { dataUrl: string; widthPt: number; heightPt: number }`
  - `function buildImagePdf(pages: RasterPage[]): Promise<Uint8Array>`

- [ ] **Step 1: Write the failing test**

Append to `src/tools/wordToPdf/helpers.test.ts`:
```ts
import { PDFDocument } from 'pdf-lib'
import { layoutTextPdf, buildImagePdf } from './helpers'

// 1x1 transparent PNG.
const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

describe('layoutTextPdf', () => {
  it('produces a one-page Letter PDF for short content', async () => {
    const bytes = await layoutTextPdf('<h1>Hi</h1><p>Short body.</p>', 'letter')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1)
    const { width, height } = doc.getPage(0).getSize()
    expect(Math.round(width)).toBe(612)
    expect(Math.round(height)).toBe(792)
  })

  it('paginates long content onto multiple pages', async () => {
    const longHtml = '<p>' + 'word '.repeat(4000) + '</p>'
    const doc = await PDFDocument.load(await layoutTextPdf(longHtml, 'a4'))
    expect(doc.getPageCount()).toBeGreaterThan(1)
  })
})

describe('buildImagePdf', () => {
  it('makes one page per raster image at the given point size', async () => {
    const bytes = await buildImagePdf([
      { dataUrl: PNG_1PX, widthPt: 200, heightPt: 300 },
      { dataUrl: PNG_1PX, widthPt: 200, heightPt: 300 },
    ])
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(2)
    expect(Math.round(doc.getPage(0).getSize().width)).toBe(200)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/wordToPdf/helpers.test.ts`
Expected: FAIL — `layoutTextPdf` / `buildImagePdf` not exported.

- [ ] **Step 3: Write minimal implementation**

Add the import at the **top** of `src/tools/wordToPdf/helpers.ts`:
```ts
import { PDFDocument, StandardFonts, type PDFFont, type PDFImage } from 'pdf-lib'
```

Append to `src/tools/wordToPdf/helpers.ts`:
```ts
const MARGIN = 56 // ~0.75in

async function embedDataUrl(doc: PDFDocument, dataUrl: string): Promise<PDFImage | null> {
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(dataUrl)
  if (!m) return null
  const raw = atob(m[2])
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0))
  return /png/i.test(m[1]) ? doc.embedPng(bytes) : doc.embedJpg(bytes)
}

interface Fonts {
  regular: PDFFont
  bold: PDFFont
  italic: PDFFont
  boldItalic: PDFFont
}

function pickFont(fonts: Fonts, bold: boolean, italic: boolean): PDFFont {
  if (bold && italic) return fonts.boldItalic
  if (bold) return fonts.bold
  if (italic) return fonts.italic
  return fonts.regular
}

/** Greedy word-wrap a run list into lines; each line is a list of styled segments. */
function wrapRuns(runs: Run[], fonts: Fonts, forceBold: boolean, size: number, maxW: number): Run[][] {
  const lines: Run[][] = [[]]
  let lineW = 0
  for (const run of runs) {
    const bold = run.bold || forceBold
    const font = pickFont(fonts, bold, run.italic)
    for (const word of run.text.split(/(\s+)/)) {
      if (!word) continue
      const ww = font.widthOfTextAtSize(word, size)
      const isSpace = word.trim() === ''
      if (isSpace && lineW === 0) continue // drop leading space on a fresh line
      if (!isSpace && lineW > 0 && lineW + ww > maxW) {
        lines.push([])
        lineW = 0
      }
      const cur = lines[lines.length - 1]
      const last = cur[cur.length - 1]
      if (last && last.bold === bold && last.italic === run.italic) last.text += word
      else cur.push({ text: word, bold, italic: run.italic })
      lineW += ww
    }
  }
  return lines.filter((l) => l.length > 0)
}

export async function layoutTextPdf(html: string, paperSize: PaperSize): Promise<Uint8Array> {
  const blocks = parseBlocks(html)
  const doc = await PDFDocument.create()
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  }
  const [pw, ph] = PAGE_SIZES[paperSize]
  const maxW = pw - MARGIN * 2
  let page = doc.addPage([pw, ph])
  let y = ph - MARGIN
  const newPage = () => {
    page = doc.addPage([pw, ph])
    y = ph - MARGIN
  }

  for (const block of blocks) {
    if (block.type === 'image') {
      const img = await embedDataUrl(doc, block.dataUrl)
      if (img) {
        const scale = Math.min(1, maxW / img.width)
        const w = img.width * scale
        const h = img.height * scale
        if (y - h < MARGIN) newPage()
        page.drawImage(img, { x: MARGIN, y: y - h, width: w, height: h })
        y -= h + 8
      }
      continue
    }

    const isHeading = block.type === 'heading'
    const size = isHeading ? (block.level === 1 ? 20 : block.level === 2 ? 16 : 13) : 11
    const lineH = size * 1.4
    const indent = block.type === 'listitem' ? 18 : 0
    const after = isHeading ? 4 : 6
    if (isHeading) y -= 10 // space before headings

    const lines = wrapRuns(block.runs, fonts, isHeading, size, maxW - indent)
    lines.forEach((line, idx) => {
      if (y - lineH < MARGIN) newPage()
      if (idx === 0 && block.type === 'listitem') {
        page.drawText(block.marker, { x: MARGIN, y: y - size, size, font: fonts.regular })
      }
      let x = MARGIN + indent
      for (const seg of line) {
        const font = pickFont(fonts, seg.bold, seg.italic)
        page.drawText(seg.text, { x, y: y - size, size, font })
        x += font.widthOfTextAtSize(seg.text, size)
      }
      y -= lineH
    })
    y -= after
  }

  return doc.save()
}

export interface RasterPage {
  dataUrl: string
  widthPt: number
  heightPt: number
}

export async function buildImagePdf(pages: RasterPage[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (const p of pages) {
    const img = await embedDataUrl(doc, p.dataUrl)
    if (!img) continue
    const page = doc.addPage([p.widthPt, p.heightPt])
    page.drawImage(img, { x: 0, y: 0, width: p.widthPt, height: p.heightPt })
  }
  return doc.save()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tools/wordToPdf/helpers.test.ts`
Expected: PASS (all helper tests green).

- [ ] **Step 5: Commit**

```bash
git add src/tools/wordToPdf/helpers.ts src/tools/wordToPdf/helpers.test.ts
git commit -m "feat(word-to-pdf): pdf-lib text-layout and image builders"
```

---

### Task 4: Transform orchestrator (`wordToPdf`)

**Files:**
- Create: `src/tools/wordToPdf/transform.ts`
- Test: `src/tools/wordToPdf/transform.test.ts`

**Interfaces:**
- Consumes: `isDocx`, `layoutTextPdf`, `buildImagePdf`, `RasterPage`, `PaperSize` (helpers); `InputFile`, `ToolResult` (`src/types.ts`).
- Produces:
  - `type ConversionMode = 'text' | 'image'`
  - `interface WordToPdfOptions { mode: ConversionMode; paperSize: PaperSize; scale: number }`
  - `interface WordToPdfDeps { docxToHtml(bytes: ArrayBuffer): Promise<{ html: string; messages: string[] }>; renderImagePages(bytes: ArrayBuffer, scale: number): Promise<RasterPage[]> }`
  - `function wordToPdf(files: InputFile[], opts: WordToPdfOptions, deps: WordToPdfDeps): Promise<ToolResult>`

- [ ] **Step 1: Write the failing test**

Create `src/tools/wordToPdf/transform.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { wordToPdf, type WordToPdfDeps, type WordToPdfOptions } from './transform'
import type { InputFile } from '../../types'

const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function docxFile(name = 'doc.docx'): InputFile {
  // PK\x03\x04 + filler so isDocx passes.
  return { id: '1', name, bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]).buffer, type: 'docx' }
}

const textOpts: WordToPdfOptions = { mode: 'text', paperSize: 'letter', scale: 2 }
const imageOpts: WordToPdfOptions = { mode: 'image', paperSize: 'letter', scale: 2 }

const deps = (over: Partial<WordToPdfDeps> = {}): WordToPdfDeps => ({
  docxToHtml: async () => ({ html: '<h1>Hi</h1><p>Body</p>', messages: [] }),
  renderImagePages: async () => [{ dataUrl: PNG_1PX, widthPt: 200, heightPt: 300 }],
  ...over,
})

describe('wordToPdf', () => {
  it('text mode renders a selectable-text PDF named <base>.pdf', async () => {
    const res = await wordToPdf([docxFile()], textOpts, deps())
    expect(res.outputs).toHaveLength(1)
    expect(res.outputs[0].name).toBe('doc.pdf')
    expect(res.outputs[0].blob.type).toBe('application/pdf')
    const pdf = await PDFDocument.load(await res.outputs[0].blob.arrayBuffer())
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1)
  })

  it('surfaces mammoth conversion messages as notes', async () => {
    const res = await wordToPdf([docxFile()], textOpts, deps({
      docxToHtml: async () => ({ html: '<p>x</p>', messages: ['Unrecognized style: Foo'] }),
    }))
    expect(res.notes?.some((n) => n.includes('Unrecognized style: Foo'))).toBe(true)
  })

  it('image mode embeds rendered pages at their point size', async () => {
    const res = await wordToPdf([docxFile()], imageOpts, deps())
    const pdf = await PDFDocument.load(await res.outputs[0].blob.arrayBuffer())
    expect(Math.round(pdf.getPage(0).getSize().width)).toBe(200)
  })

  it('skips a legacy .doc with a helpful note and no output', async () => {
    const legacy: InputFile = { id: '2', name: 'old.doc', bytes: new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]).buffer, type: 'doc' }
    const res = await wordToPdf([legacy], textOpts, deps())
    expect(res.outputs).toHaveLength(0)
    expect(res.notes?.[0]).toMatch(/legacy \.doc/)
  })

  it('collects a per-file error into notes instead of throwing', async () => {
    const res = await wordToPdf([docxFile('boom.docx')], imageOpts, deps({
      renderImagePages: async () => {
        throw new Error('render failed')
      },
    }))
    expect(res.outputs).toHaveLength(0)
    expect(res.notes?.[0]).toMatch(/Skipped boom\.docx: render failed/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/wordToPdf/transform.test.ts`
Expected: FAIL — cannot resolve `./transform`.

- [ ] **Step 3: Write minimal implementation**

Create `src/tools/wordToPdf/transform.ts`:
```ts
import type { InputFile, ToolResult } from '../../types'
import { isDocx, layoutTextPdf, buildImagePdf, type PaperSize, type RasterPage } from './helpers'

export type ConversionMode = 'text' | 'image'

export interface WordToPdfOptions {
  mode: ConversionMode
  paperSize: PaperSize
  scale: number
}

export interface WordToPdfDeps {
  docxToHtml(bytes: ArrayBuffer): Promise<{ html: string; messages: string[] }>
  renderImagePages(bytes: ArrayBuffer, scale: number): Promise<RasterPage[]>
}

export async function wordToPdf(
  files: InputFile[],
  opts: WordToPdfOptions,
  deps: WordToPdfDeps,
): Promise<ToolResult> {
  const outputs: ToolResult['outputs'] = []
  const notes: string[] = []
  for (const file of files) {
    const base = file.name.replace(/\.[^.]+$/, '')
    if (!isDocx(file.bytes)) {
      notes.push(`Skipped ${file.name}: legacy .doc isn't supported — save as .docx in Word first`)
      continue
    }
    try {
      let pdfBytes: Uint8Array
      if (opts.mode === 'image') {
        const pages = await deps.renderImagePages(file.bytes, opts.scale)
        if (!pages.length) throw new Error('no pages were rendered')
        pdfBytes = await buildImagePdf(pages)
      } else {
        const { html, messages } = await deps.docxToHtml(file.bytes)
        pdfBytes = await layoutTextPdf(html, opts.paperSize)
        for (const m of messages) notes.push(`${file.name}: ${m}`)
      }
      outputs.push({
        name: `${base}.pdf`,
        blob: new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' }),
      })
    } catch (err) {
      notes.push(`Skipped ${file.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return { outputs, notes: notes.length ? notes : undefined }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tools/wordToPdf/transform.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/wordToPdf/transform.ts src/tools/wordToPdf/transform.test.ts
git commit -m "feat(word-to-pdf): transform orchestrator with injected deps"
```

---

### Task 5: Real browser deps (`deps.ts`)

**Files:**
- Create: `src/tools/wordToPdf/deps.ts`
- (Conditional) Create: `src/tools/wordToPdf/shims.d.ts`

**Interfaces:**
- Consumes: `wordToPdf`, `WordToPdfOptions`, `WordToPdfDeps`, `RasterPage` (Task 4 / helpers); runtime libs `mammoth`, `docx-preview`, `html2canvas`.
- Produces: `function convertWordToPdf(files: InputFile[], options: WordToPdfOptions): Promise<ToolResult>` — the main-thread entry the Panel calls. **Not unit-tested** (browser-only seam); verified manually in Task 7.

- [ ] **Step 1: Write the implementation**

Create `src/tools/wordToPdf/deps.ts`:
```ts
import type { InputFile, ToolResult } from '../../types'
import { wordToPdf, type WordToPdfOptions, type WordToPdfDeps } from './transform'
import type { RasterPage } from './helpers'

const PT_PER_PX = 72 / 96 // CSS px → PDF points

/** Off-screen but laid-out container (NOT display:none, so it has real geometry). */
function makeHiddenContainer(): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;left:-99999px;top:0;width:auto;'
  document.body.appendChild(el)
  return el
}

const realDeps: WordToPdfDeps = {
  async docxToHtml(bytes) {
    const mammoth = await import('mammoth')
    const { value, messages } = await mammoth.convertToHtml({ arrayBuffer: bytes })
    return { html: value, messages: messages.map((m) => m.message) }
  },

  async renderImagePages(bytes, scale) {
    const { renderAsync } = await import('docx-preview')
    const html2canvas = (await import('html2canvas')).default
    const container = makeHiddenContainer()
    try {
      await renderAsync(new Blob([bytes]), container, undefined, {
        className: 'docx',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
      })
      // docx-preview emits one <section> per page. Verify this selector in Safari (Task 7).
      const sections = Array.from(container.querySelectorAll('section'))
      const pages: RasterPage[] = []
      for (const section of sections) {
        const canvas = await html2canvas(section as HTMLElement, {
          scale,
          useCORS: true,
          backgroundColor: '#ffffff',
        })
        const rect = (section as HTMLElement).getBoundingClientRect()
        pages.push({
          dataUrl: canvas.toDataURL('image/jpeg', 0.92),
          widthPt: rect.width * PT_PER_PX,
          heightPt: rect.height * PT_PER_PX,
        })
        await new Promise((r) => setTimeout(r)) // yield so the UI stays alive
      }
      return pages
    } finally {
      container.remove()
    }
  },
}

export function convertWordToPdf(files: InputFile[], options: WordToPdfOptions): Promise<ToolResult> {
  return wordToPdf(files, options, realDeps)
}
```

- [ ] **Step 2: Typecheck and add a module shim only if required**

Run: `npm run typecheck`
Expected: PASS.

If (and only if) tsc reports a missing-types error for `mammoth`, `docx-preview`, or `html2canvas`, create `src/tools/wordToPdf/shims.d.ts` declaring the missing module(s), e.g.:
```ts
declare module 'mammoth'
```
Then re-run `npm run typecheck` and expect PASS. If typecheck already passed, do **not** create this file.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors in `src/tools/wordToPdf/deps.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/tools/wordToPdf/deps.ts
git add src/tools/wordToPdf/shims.d.ts 2>/dev/null || true
git commit -m "feat(word-to-pdf): wire real mammoth/docx-preview/html2canvas deps"
```

---

### Task 6: Panel UI (`Panel.tsx`)

**Files:**
- Create: `src/tools/wordToPdf/Panel.tsx`

**Interfaces:**
- Consumes: `PanelProps` (`src/components/ToolPage.tsx`); `convertWordToPdf` (Task 5); `WordToPdfOptions`, `ConversionMode` (Task 4); `PaperSize` (helpers).
- Produces: `function WordToPdfPanel(props: PanelProps): JSX.Element`.

- [ ] **Step 1: Write the implementation**

Create `src/tools/wordToPdf/Panel.tsx`:
```tsx
import { useState } from 'react'
import type { PanelProps } from '../../components/ToolPage'
import type { ConversionMode } from './transform'
import type { PaperSize } from './helpers'
import { convertWordToPdf } from './deps'

export function WordToPdfPanel({ files, busy, onRun }: PanelProps) {
  const [mode, setMode] = useState<ConversionMode>('text')
  const [paperSize, setPaperSize] = useState<PaperSize>('letter')
  const [scale, setScale] = useState(2)

  return (
    <div className="space-y-3">
      <label className="field-label">
        Output
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as ConversionMode)}
          className="field-input"
        >
          <option value="text">Selectable text — searchable, small files</option>
          <option value="image">Looks like Word — pixel-faithful, not selectable</option>
        </select>
      </label>

      {mode === 'text' ? (
        <label className="field-label">
          Paper size
          <select
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value as PaperSize)}
            className="field-input"
          >
            <option value="letter">US Letter</option>
            <option value="a4">A4</option>
          </select>
        </label>
      ) : (
        <label className="field-label">
          Quality: {scale}×
          <input
            type="range" min={1} max={3} step={1}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="range-input"
          />
        </label>
      )}

      <p className="text-sm text-muted">
        {mode === 'text'
          ? 'Best for text you want to select or search. Fonts, tables, and exact spacing are simplified.'
          : 'Best when it must look exactly like Word. Larger file; text is an image and not selectable.'}
      </p>

      <button
        disabled={busy || files.length === 0}
        onClick={() => onRun(() => convertWordToPdf(files, { mode, paperSize, scale }))}
        className="btn-primary"
      >
        {busy ? 'Converting…' : 'Convert to PDF'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/tools/wordToPdf/Panel.tsx
git commit -m "feat(word-to-pdf): panel with mode toggle and options"
```

---

### Task 7: Register tool, add icon, manual verification

**Files:**
- Modify: `src/tools/registry.tsx`
- Modify: `src/components/icons.tsx`

**Interfaces:**
- Consumes: `WordToPdfPanel` (Task 6).
- Produces: a `TOOLS` entry with `def.id === 'word-to-pdf'`; a matching `ToolGlyphs['word-to-pdf']` icon.

- [ ] **Step 1: Add the icon glyph**

In `src/components/icons.tsx`, add this entry to the `ToolGlyphs` object (place it after the `'extract-text'` entry):
```tsx
  'word-to-pdf': (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
      <path d="M8 8.5l1 4 1.5-4 1.5 4 1-4" />
      <path d="M8.5 16h7" />
    </>
  ),
```

- [ ] **Step 2: Register the tool**

In `src/tools/registry.tsx`, add the import after the other tool imports:
```tsx
import { WordToPdfPanel } from './wordToPdf/Panel'
```
Then add this entry to the `TOOLS` array (place it right before the `images-to-pdf` entry, grouping it with the document tools):
```tsx
  {
    def: {
      id: 'word-to-pdf',
      title: 'Word to PDF',
      description: 'Convert .docx files to PDF — selectable text or pixel-faithful.',
      accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    renderPanel: (p) => <WordToPdfPanel {...p} />,
  },
```

- [ ] **Step 3: Full verification suite**

Run: `npx vitest run && npm run typecheck && npm run lint`
Expected: all tests pass, no type errors, no lint errors.

- [ ] **Step 4: Manual verification in Safari**

Run: `npm run dev`, open the printed `localhost` URL **in Safari**, and open the **Word to PDF** tool. Verify with a real `.docx` (one with headings, a list, a table, and an image):
1. **Text mode (default):** convert → downloaded PDF opens, text is **selectable**, headings/lists present, paper size matches the dropdown. Switch A4/Letter and reconvert.
2. **Image mode:** convert → PDF **visually resembles** Word (fonts, table, image). **Critical:** confirm one PDF page per Word page. If the page count is wrong, the `querySelectorAll('section')` selector in `deps.ts` is matching the wrong elements — inspect the rendered DOM in Safari's Web Inspector, find the actual per-page element class (docx-preview pages), and adjust the selector. Re-verify.
3. **Legacy `.doc`:** drop a `.doc` file → it's skipped with the "save as .docx" note; no broken output.
4. **Batch:** drop two `.docx` files → two PDFs, offered as a zip by `ResultView`.
5. **UI responsiveness:** during a multi-page image conversion the button reads "Converting…" and the tab doesn't hard-freeze (yielding works).

- [ ] **Step 5: Commit**

```bash
git add src/tools/registry.tsx src/components/icons.tsx
git commit -m "feat(word-to-pdf): register tool and add icon"
```

---

## Self-Review

**Spec coverage:**
- Two modes + toggle, default text → Tasks 4 (branch), 6 (toggle, default `text`). ✅
- Image pipeline (docx-preview → html2canvas → pdf-lib) → Task 5 `renderImagePages` + Task 3 `buildImagePdf`. ✅
- Text pipeline (mammoth → DOMParser → pdf-lib) → Task 5 `docxToHtml` + Tasks 2–3 `parseBlocks`/`layoutTextPdf`. ✅
- `.docx`-only, `.doc` rejected with note → Task 1 `isDocx` + Task 4 skip note. ✅
- Batch: one PDF per file, zipped by ResultView → Task 4 loop (`<base>.pdf`) + existing `ResultView`. ✅
- Per-file try/catch → notes → Task 4. ✅
- Main-thread, no `worker.ts`, Panel calls converter directly → Tasks 5–6. ✅
- Dep-injection for testability → Task 4 `WordToPdfDeps`, stubbed in tests. ✅
- Lazy-load new libs via dynamic import → Task 5. ✅
- Registry entry + accept string + icon → Task 7. ✅
- Offline guarantee (no network) → no fetch in any task; all libs client-side. ✅
- Mammoth conversion messages surfaced → Task 4 + test. ✅
- Known untested browser seam (docx-preview + html2canvas) verified manually → Task 7 Step 4. ✅
- Paper size option (text mode) / image scale option → Tasks 3/5/6. ✅

**Placeholder scan:** No TBD/TODO; every code step shows complete code; the only conditional (`shims.d.ts`) includes its exact content and a clear gate. ✅

**Type consistency:** `WordToPdfOptions { mode, paperSize, scale }`, `WordToPdfDeps { docxToHtml, renderImagePages }`, `RasterPage { dataUrl, widthPt, heightPt }`, `Block`/`Run`, and `convertWordToPdf(files, options)` are used identically across helpers, transform, deps, Panel, and tests. ✅
