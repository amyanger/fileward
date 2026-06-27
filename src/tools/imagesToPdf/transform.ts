import { PDFDocument } from 'pdf-lib'
import type { InputFile, ToolResult } from '../../types'

export interface ImagesToPdfOptions {
  pageSize: 'fit' | 'a4'
  orientation: 'portrait' | 'landscape'
}

const A4 = { w: 595.28, h: 841.89 }

export async function imagesToPdf(
  files: InputFile[],
  opts: ImagesToPdfOptions,
): Promise<ToolResult> {
  const doc = await PDFDocument.create()
  const notes: string[] = []
  for (const file of files) {
    try {
      const bytes = new Uint8Array(file.bytes)
      const isPng = file.type.includes('png')
      const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
      if (opts.pageSize === 'fit') {
        const page = doc.addPage([image.width, image.height])
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
      } else {
        const [w, h] =
          opts.orientation === 'portrait' ? [A4.w, A4.h] : [A4.h, A4.w]
        const page = doc.addPage([w, h])
        const scale = Math.min(w / image.width, h / image.height)
        const dw = image.width * scale
        const dh = image.height * scale
        page.drawImage(image, { x: (w - dw) / 2, y: (h - dh) / 2, width: dw, height: dh })
      }
    } catch (err) {
      notes.push(`Skipped ${file.name}: ${(err as Error).message}`)
    }
  }
  if (doc.getPageCount() === 0) throw new Error('No valid images to convert')
  const out = await doc.save()
  return {
    outputs: [{ name: 'combined.pdf', blob: new Blob([new Uint8Array(out)], { type: 'application/pdf' }) }],
    notes: notes.length ? notes : undefined,
  }
}
