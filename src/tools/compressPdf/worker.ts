import * as pdfjsLib from 'pdfjs-dist'
import type { TransformMessage, TransformReply } from '../../types'
import { compressPdf, type CompressPdfOptions, type CompressDeps, type PageRaster } from './transform'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const deps: CompressDeps = {
  async rasterize(bytes, scale, quality) {
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise
    const out: PageRaster[] = []
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
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
      out.push({ width: viewport.width, height: viewport.height, jpeg: await blob.arrayBuffer() })
    }
    await doc.cleanup()
    return out
  },
}

self.onmessage = async (e: MessageEvent<TransformMessage<CompressPdfOptions>>) => {
  try {
    const result = await compressPdf(e.data.files, e.data.options, deps)
    ;(self as unknown as Worker).postMessage({ ok: true, result } as TransformReply)
  } catch (err) {
    ;(self as unknown as Worker).postMessage({
      ok: false,
      error: (err as Error).message,
    } as TransformReply)
  }
}
