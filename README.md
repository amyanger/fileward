# Fileward

PDF & image tools that never upload your files. Every transform runs entirely in
your browser via Web Workers — nothing is sent to a server, so your documents stay
on your device.

## Tools

- **Organize Pages** — reorder, rotate, and delete PDF pages
- **Merge & Split PDFs** — combine PDFs or pull out a page range
- **Compress PDF** — shrink large or scanned PDFs
- **Add Page Numbers** — stamp page numbers with position, format, size, and margin
- **Watermark PDF** — overlay text like CONFIDENTIAL across pages, with color control
- **Extract Text** — pull selectable text out of a PDF to a .txt file
- **Images → PDF** — turn photos or scans into one PDF
- **PDF → Images** — export PDF pages as PNG or JPG
- **Compress & Convert Images** — resize and convert PNG/JPG/WebP

## Getting started

```bash
npm install
npm run dev      # start the Vite dev server
```

Then open the printed `http://localhost:…` URL in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Lint with oxlint |
| `npx vitest run` | Run the test suite once |

## How it works

Each tool lives in `src/tools/<tool>/` and follows the same shape:

- `transform.ts` — pure transform logic; heavy dependencies (pdf.js, canvas) are
  injected so the logic stays unit-testable
- `worker.ts` — runs the transform off the main thread in a Web Worker
- `Panel.tsx` — the tool's options UI
- `transform.test.ts` — tests against the pure transform

Tools are registered in `src/tools/registry.tsx`. Built with React 19, TypeScript,
Vite, and Tailwind CSS.
