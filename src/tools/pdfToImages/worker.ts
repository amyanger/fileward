import * as pdfjsLib from 'pdfjs-dist'
import type { TransformMessage, TransformReply } from '../../types'
import { pdfToImages, type PdfToImagesOptions, type PdfRenderDeps } from './transform'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const deps: PdfRenderDeps = {
  async renderDocument(bytes, scale, format) {
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise
    const blobs: Blob[] = []
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const viewport = page.getViewport({ scale })
      const canvas = new OffscreenCanvas(viewport.width, viewport.height)
      const ctx = canvas.getContext('2d')!
      await page.render({
        canvas: canvas as unknown as HTMLCanvasElement,
        canvasContext: ctx as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise
      const blob = await canvas.convertToBlob({ type: format, quality: 0.92 })
      blobs.push(blob)
    }
    await doc.cleanup()
    return blobs
  },
}

self.onmessage = async (e: MessageEvent<TransformMessage<PdfToImagesOptions>>) => {
  try {
    const result = await pdfToImages(e.data.files, e.data.options, deps)
    ;(self as unknown as Worker).postMessage({ ok: true, result } as TransformReply)
  } catch (err) {
    ;(self as unknown as Worker).postMessage({
      ok: false,
      error: (err as Error).message,
    } as TransformReply)
  }
}
