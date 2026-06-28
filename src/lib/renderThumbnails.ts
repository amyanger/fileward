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
