import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import type { InputFile, ToolResult } from '../../types'
import { centerOrigin, tileOrigins, type WatermarkLayout } from './helpers'

export interface WatermarkOptions {
  text: string
  opacity: number
  angle: number
  fontSize: number
  layout: WatermarkLayout
}

export async function addWatermark(
  files: InputFile[],
  opts: WatermarkOptions,
): Promise<ToolResult> {
  const outputs = []
  const notes: string[] = []
  for (const file of files) {
    const base = file.name.replace(/\.[^.]+$/, '')
    try {
      const doc = await PDFDocument.load(new Uint8Array(file.bytes))
      const font = await doc.embedFont(StandardFonts.Helvetica)
      const textW = font.widthOfTextAtSize(opts.text, opts.fontSize)
      const common = {
        size: opts.fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity: opts.opacity,
        rotate: degrees(opts.angle),
      }
      for (const page of doc.getPages()) {
        const { width, height } = page.getSize()
        if (opts.layout === 'tile') {
          for (const o of tileOrigins(width, height, opts.fontSize * 8, opts.fontSize * 5)) {
            page.drawText(opts.text, { x: o.x, y: o.y, ...common })
          }
        } else {
          const o = centerOrigin(width, height, textW, opts.fontSize, opts.angle)
          page.drawText(opts.text, { x: o.x, y: o.y, ...common })
        }
      }
      const saved = await doc.save()
      outputs.push({
        name: `${base}-watermarked.pdf`,
        blob: new Blob([new Uint8Array(saved)], { type: 'application/pdf' }),
      })
    } catch (err) {
      notes.push(`Skipped ${file.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return { outputs, notes: notes.length ? notes : undefined }
}
