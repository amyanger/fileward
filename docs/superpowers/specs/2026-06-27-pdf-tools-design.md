# Fileward — Four New PDF Tools

**Date:** 2026-06-27
**Status:** Approved design, pending implementation plans

## Goal

Add four PDF capabilities that everyday users commonly need, as **four separate
tools** in the existing tool hub. Preserve Fileward's core guarantee: everything
runs client-side, no network calls in any transform.

The four tools:

1. **Organize Pages** — visual thumbnail grid to reorder, rotate, and delete pages.
2. **Add Page Numbers** — stamp page numbers with position/format/start options.
3. **Watermark** — overlay text (e.g. CONFIDENTIAL) across pages.
4. **Extract Text** — pull copyable text out of a PDF to a `.txt` file.

## Constraints

- 100% client-side. No network calls in transforms.
- Reuse the existing per-tool structure: `transform.ts` (pure, dep-injected),
  `worker.ts`, `Panel.tsx`, `transform.test.ts`, registered in `registry.tsx`.
- No new heavy dependencies. All four use the existing `pdf-lib` and/or
  `pdfjs-dist`.
- Keep transforms pure and dependency-injected where they touch pdf.js, so they
  remain unit-testable in jsdom (pdf-lib may be imported directly, as `mergeSplit`
  already does; pdf.js rasterize/text deps must be injected).

## Architecture overview

Three of the four tools fit the **current flow with no new infrastructure**:
add files → set options → `onRun(run)` → `ResultView`.

- **Add Page Numbers** and **Watermark** are pure `pdf-lib` text-drawing —
  same shape as `imagesToPdf`.
- **Extract Text** uses `pdf.js` in the worker — same shape as `pdfToImages`,
  inheriting the same gotchas: set `GlobalWorkerOptions.workerSrc`, read
  `byteLength`/needed input *before* the ArrayBuffer detaches, and `runWorker`
  must ignore pdf.js's fake-worker handshake messages.

**Organize Pages** is the only tool that diverges from the pattern, because its
interactive thumbnail grid *is* the options UI.

## Tool 1 — Organize Pages

### Why it diverges

The thumbnail grid replaces the static options panel. The user manipulates pages
directly (reorder / rotate / delete) instead of filling in form fields.

### Design

- **Thumbnails render on the main thread** inside `Panel.tsx` via `pdf.js`.
  pdf.js's "fake worker" problem only occurs when pdf.js runs inside *our* Web
  Worker; on the main thread it uses its own real worker and is fast. Extract
  this as `src/lib/renderThumbnails.ts` so it is reusable later (previews
  elsewhere, future tools). It progressively yields `{ index, dataUrl }` so the
  grid can populate as pages render.
- **Panel state** = an ordered list of `{ srcPageIndex, rotation }`. UI affords:
  drag-to-reorder, a rotate button per page (90° increments), a delete button per
  page. A page is "deleted" simply by being absent from the list.
- **Saving is a conventional one-shot worker call.** `transform.ts` exports
  `organizePages(file, ops)` where `ops: Array<{ srcPageIndex, rotation }>`.
  It uses `pdf-lib` directly: load source, `copyPages` in the new order,
  `setRotation(degrees(rotation))` per copied page, `save()`. Pure and
  jsdom-testable, exactly like `mergeSplit`.
- Guard: if `ops` is empty (all pages deleted), throw a clear error.

### Files

- `src/tools/organizePages/transform.ts` — pure `organizePages(file, ops)`.
- `src/tools/organizePages/worker.ts` — wires pdf-lib, one-shot `{ok,result}`.
- `src/tools/organizePages/Panel.tsx` — thumbnail grid + reorder/rotate/delete,
  then `onRun`.
- `src/tools/organizePages/transform.test.ts` — pure-logic tests.
- `src/lib/renderThumbnails.ts` — main-thread pdf.js thumbnail helper.

## Tool 2 — Add Page Numbers

Pure `pdf-lib`. Embed `StandardFonts.Helvetica`, draw text on every page.

**Options:**
- Position: 6 anchors (bottom-left / bottom-center / bottom-right / top-*).
- Start number (default 1).
- Format: `1`, `1 / N`, `Page 1`.
- Font size, margin.

Standard four-file pattern; `Panel.tsx` reuses the existing options/run flow.

## Tool 3 — Watermark

Pure `pdf-lib`. Draw text on every page.

**Options:**
- Text (default "CONFIDENTIAL").
- Opacity (default ~0.15).
- Angle (default 45°).
- Font size.
- Layout: single centered vs tiled across the page.

Standard four-file pattern.

## Tool 4 — Extract Text

`pdf.js` `getTextContent()` per page in the worker, joined into a `.txt` blob.
Text-extraction injected as a dep so the transform is testable with a stub.

**Options:**
- Preserve page breaks (insert a separator between pages).

**Edge case:** if no text layer is found (scanned PDF), return a clear message —
"No selectable text found — this looks like a scanned PDF" — instead of an empty
file. `Panel.tsx` shows a copy-to-clipboard preview; `ResultView` offers the
`.txt` download.

Inherits pdf.js worker gotchas (workerSrc, buffer detach, fake-worker handshake).

## Testing

- Each `transform.test.ts` tests pure logic with stubbed deps. pdf-lib runs in
  jsdom (proven by existing `mergeSplit` tests); pdf.js text extraction is stubbed.
- Uncovered seam (unchanged from today): `runWorker` + real pdf.js. Bugs there
  pass unit tests — exercise manually in Safari.

## Build order

Each tool is its own spec → plan → implementation cycle. Recommended order:

1. **Add Page Numbers** — lowest-risk, reuses `imagesToPdf` pattern exactly.
2. **Watermark** — same pattern, slightly more option logic.
3. **Extract Text** — reuses `pdfToImages` pdf.js worker pattern.
4. **Organize Pages** — last; the only novel piece (`renderThumbnails` +
   interactive grid) once the simple wins are banked.

## Out of scope

- Password protect / unlock (pdf-lib can't encrypt; needs a new crypto lib).
- OCR for scanned PDFs (needs tesseract.js; heavy).
- Combining any of these into a unified editor — explicitly chose four separate
  tool cards to match the existing hub pattern.
