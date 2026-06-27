# Fileward — Private, in-browser file toolkit

**Status:** Approved design
**Date:** 2026-06-27

## Summary

Fileward is a static web app for everyday PDF and image tasks — merge, split,
compress, and convert — with one defining promise: **files never leave the
user's device.** No upload, no account, no server. All processing runs in the
browser. The app works offline, and that fact is verifiable in devtools, which
becomes the core trust/marketing hook against the many sketchy "free PDF" sites
that silently upload user files.

## Positioning

- Core identity: "Your files stay on your machine. Nothing is ever uploaded."
- Visible proof point: a "works offline — try turning off your wifi" call-out.
- Honesty over hype: where a client-side operation has real limits (e.g. PDF
  compression on text-only documents), the UI states it plainly and shows
  before/after sizes so results are never misleading.

## Architecture (all client-side)

- **Static SPA:** Vite + React + TypeScript + Tailwind CSS. No backend, ever.
  Deployable as static files (any static host / GitHub Pages).
- **Web Workers** handle all heavy processing (PDF/image work) so the UI thread
  never freezes on large files.
- **Libraries:**
  - `pdf-lib` — merge, split, assemble, reorder/rotate/delete pages, images→PDF.
  - `pdf.js` — render PDF pages to canvas (PDF→images, and rasterization used
    for compression).
  - Native Canvas API — image resize, compress, and format conversion.
  - `client-zip` — bundle multi-file outputs into a single download.
- No file is ever sent over the network. Absence of upload requests is
  observable in devtools and is treated as a feature.

## Components / structure

- **Tool hub** — landing page with a grid of tool cards (Merge & Split,
  Compress PDF, Images→PDF, PDF→Images, Image convert).
- **Shared dropzone + file-list** — drag/drop, reorder, remove. Reused by every
  tool. Independently testable.
- **Per-tool modules** — each tool is an isolated unit containing its own worker
  logic, options UI, and a pure `run()` transform function. New tools can be
  added without touching existing ones.
- **Result view** — preview + download (single file, or a zip via `client-zip`
  for batches).

### Module boundaries

Each tool module exposes:
- a pure transform function (input files + options → output files) that runs in
  a worker and is unit-testable in isolation, and
- an options UI component.

The dropzone/file-list and result view are shared shell components consumed by
all tools. This keeps each tool understandable and changeable on its own.

## v1 tools

1. **Merge & split** — combine multiple PDFs; reorder, rotate, and delete pages;
   extract a page range into a new PDF.
2. **Compress PDF** — downsample embedded images toward a target quality.
   *Expectation, stated in-UI: strong shrink on image-heavy/scanned PDFs,
   modest on text-only PDFs. Before/after size always shown.*
3. **Images → PDF** — combine photos/scans into one PDF, with page size and
   orientation options.
4. **PDF → images** — export pages as PNG or JPG at a chosen resolution.
5. **Image compress & convert** — resize and convert between PNG / JPG / WebP
   with a quality slider and a live output-size readout.

## Error handling

- Validate file type and size up front; show friendly messages.
- Handle corrupt, password-protected/encrypted, and very large files gracefully
  with clear explanations rather than crashes.
- Workers catch and report failures per file, so one bad file does not kill an
  entire batch.

## Testing

- **Vitest** unit tests on each tool's pure transform function using small
  fixture PDFs/images.
- **Component tests** for dropzone/file-list interactions (add, reorder,
  remove).
- Manual verification that output PDFs/images open correctly in standard
  viewers.

## Explicitly NOT in v1 (YAGNI)

OCR, e-signatures, PDF editing/annotation, accounts, cloud sync, mobile app.
Ship the focused toolkit first; revisit additions afterward.

## Open follow-ups (post-v1)

- Additional tools (e.g. rotate-only, watermark, page numbering).
- PWA/installable + full offline asset caching.
- Drag-to-reorder thumbnails for PDF pages.
