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
