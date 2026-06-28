# Word to PDF — Design Spec

**Date:** 2026-06-28
**Tool id:** `word-to-pdf`
**Status:** Approved, ready for implementation plan

## Summary

A new Fileward tool that converts Microsoft Word `.docx` files to PDF, entirely
client-side. It offers two modes via a toggle:

- **Selectable text (default)** — `mammoth` extracts content to clean HTML, which
  is laid out into a true text PDF. Searchable/selectable, small files. Does *not*
  visually match the original (fonts, tables, exact spacing simplified).
- **Looks like Word (image)** — `docx-preview` renders the document faithfully into
  the DOM, then each page-section is rasterized and embedded into the PDF. High
  visual fidelity. Text is a non-selectable image; larger files.

Both pipelines run on the **main thread** (see Architecture). The offline guarantee
is preserved: all libraries run fully in-browser with zero network calls.

## Scope

**In scope**
- `.docx` (OOXML) input only.
- Two conversion modes with a UI toggle; default = selectable text.
- Batch input: each `.docx` → one output PDF; multiple files zipped by `ResultView`.
- Graceful per-file error handling (skips collected in `notes`, never throws).

**Out of scope**
- `.doc` (legacy OLE/CFB binary) — not realistically convertible in-browser.
  Rejected with a clear note.
- Pixel-perfect Word reproduction with selectable text simultaneously — impossible
  client-side without a heavy WASM LibreOffice (explicitly excluded).
- Server-side or network-assisted conversion of any kind.

## Architecture

### The one deviation: this tool runs on the main thread

Every other tool runs its transform in a Web Worker. This tool cannot, and the
deviation is deliberate and forced:

- **Image mode** needs a live DOM. `docx-preview` renders into real DOM elements and
  `html2canvas` rasterizes them. Neither works without `document`/layout, which
  workers lack.
- **Text mode** also lands on the main thread. The clean route is
  `mammoth` → HTML string → `DOMParser` → walk the DOM → lay out with `pdf-lib`,
  and `DOMParser` is unavailable in workers.

Unifying on the main thread gives **one shared parse step** ("parse the `.docx` into
a hidden, laid-out DOM container") feeding **two renderers**. We render into an
offscreen container (`position: fixed; left: -99999px` — *not* `display: none`, so
it has real layout) and `await` a yield to the event loop between pages to keep the
UI responsive behind a "Converting…" state.

The `Panel` contract is `onRun(() => Promise<ToolResult>)` — it does not require a
worker. So the Panel calls a main-thread converter directly and this tool has **no
`worker.ts`**.

### Files (`src/tools/wordToPdf/`)

- **`transform.ts`** — pure orchestrator. Per-file loop, mode branching, output
  naming, error→`notes`. Heavy deps (mammoth, docx-preview render, html2canvas, the
  hidden-container factory, pdf-lib) **injected as `deps`** so it is testable in
  jsdom. No direct library/DOM calls here — same dep-injection discipline as the
  pdf.js tools.
- **`deps.ts`** (replaces `worker.ts`) — wires the real browser deps via dynamic
  `import()` (docx-preview `renderAsync`, `html2canvas`, `mammoth`, `pdf-lib`,
  hidden-container factory) and exposes `convertWordToPdf(files, options)` for the
  Panel.
- **`Panel.tsx`** — mode toggle (Selectable text ▸ default / Looks like Word), a
  paper-size select (A4 / Letter) for text mode, an image-quality scale for image
  mode, and the run button. Calls `onRun(() => convertWordToPdf(files, options))`.
- **`transform.test.ts`** — tests orchestration with stubbed deps.
- **`helpers.ts` + `helpers.test.ts`** — pure helpers: the minimal HTML-node →
  pdf-lib text layout (paragraphs, h1–h3, bold/italic, ul/ol lists, images; tables
  simplified) and page-section measuring/pagination math.

### Options shape

```ts
export interface WordToPdfOptions {
  mode: 'text' | 'image'      // default 'text'
  paperSize: 'a4' | 'letter'  // text mode only; default 'letter'
  scale: number               // image mode only; html2canvas scale, default 2
}
```

## Pipelines

### Text mode (default)

1. `mammoth.convertToHtml({ arrayBuffer })` → clean HTML string. Conversion
   messages surfaced into `notes`.
2. `DOMParser` parses the HTML; a pure layout pass (`helpers.ts`) walks the body and
   emits to a `pdf-lib` document: paragraphs with word-wrap, headings (h1–h3) sized,
   bold/italic runs, ul/ol lists, embedded images (base64 → embedded). Tables are
   flattened to simple rows with a note. Pagination tracks a y-cursor against the
   chosen `paperSize`.
3. Output: a selectable, searchable, small PDF.

### Image mode

1. `docx-preview.renderAsync(blob, container, styleContainer)` renders into the
   hidden container as page-sized `<section>` elements (honoring the document's own
   page size, margins, headers/footers, tables, fonts).
2. For each section: `html2canvas(section, { scale })` → canvas → JPEG/PNG → embed
   into a `pdf-lib` page sized to that section. Yield to the event loop between
   sections.
3. Output: a high-fidelity, non-selectable, larger PDF.

## Inputs, batch, errors

- **Accept `.docx` only.** Detect by zip magic bytes (`PK\x03\x04`) and/or extension.
  A `.doc` or non-docx input pushes
  `Skipped <name>: legacy .doc isn't supported — save as .docx in Word first` to
  `notes` and processing continues. No throws.
- **Batch:** each input file → one output PDF named `<base>.pdf`. Multiple files →
  `ResultView` zips them, same as other tools.
- **Per-file `try/catch`** collects failures into `notes` (graceful degradation).
  Read `file.bytes.byteLength` (and anything else needed from the input) before any
  step that might detach the `ArrayBuffer`.

## Dependencies & offline guarantee

Add three client-side libraries — `mammoth`, `docx-preview`, `html2canvas`
(`pdf-lib` is already a dependency). All run fully in-browser with **zero network
calls**, preserving Fileward's offline guarantee. Bundle impact is real (hundreds of
KB) but mitigated by lazy-loading them via dynamic `import()` inside `deps.ts`, so
they load only when this tool actually runs.

## Registry entry (`src/tools/registry.tsx`)

```tsx
{
  def: {
    id: 'word-to-pdf',
    title: 'Word to PDF',
    description: 'Convert .docx files to PDF — selectable text or pixel-faithful.',
    accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  renderPanel: (p) => <WordToPdfPanel {...p} />,
}
```

## Testing

- `transform.test.ts` + `helpers.test.ts` run in jsdom with stubbed deps, covering:
  the per-file loop, mode dispatch, `.doc` rejection note, output naming, batch error
  collection, and the pure text-layout/pagination math.
- Visual fidelity (docx-preview + html2canvas) is **browser-only** and verified
  manually in Safari — not unit-tested. This is the known untested seam, analogous to
  `runWorker` + real pdf.js noted in `CLAUDE.md`.

## Risks & honest limitations

- **Text mode does not look like Word** — fonts, table styling, headers/footers, and
  exact spacing are simplified. This is communicated by the mode labels.
- **Image mode text is not selectable/searchable**, and files are larger.
- **Fonts may be substituted** in image mode if the document's fonts aren't available
  to the browser; non-Latin scripts especially.
- **Main-thread conversion** can briefly jank the UI on large documents despite
  yielding; a clear "Converting…" state mitigates this.
- **`.doc` is unsupported** — rejected with guidance, not silently failed.
