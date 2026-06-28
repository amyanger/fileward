import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { InputFile, ToolResult } from '../../types'
import {
  anchorXY,
  formatPageNumber,
  type PageNumberFormat,
  type PageNumberPosition,
} from './helpers'

export interface PageNumbersOptions {
  position: PageNumberPosition
  format: PageNumberFormat
  startAt: number
  fontSize: number
  margin: number
}

export async function addPageNumbers(
  files: InputFile[],
  opts: PageNumbersOptions,
): Promise<ToolResult> {
  const outputs = []
  const notes: string[] = []
  for (const file of files) {
    const base = file.name.replace(/\.[^.]+$/, '')
    try {
      const doc = await PDFDocument.load(new Uint8Array(file.bytes))
      const font = await doc.embedFont(StandardFonts.Helvetica)
      const pages = doc.getPages()
      const total = pages.length
      pages.forEach((page, i) => {
        const label = formatPageNumber(opts.format, opts.startAt + i, opts.startAt + total - 1)
        const textW = font.widthOfTextAtSize(label, opts.fontSize)
        const { width, height } = page.getSize()
        const { x, y } = anchorXY(opts.position, width, height, textW, opts.fontSize, opts.margin)
        page.drawText(label, { x, y, size: opts.fontSize, font })
      })
      const saved = await doc.save()
      outputs.push({
        name: `${base}-numbered.pdf`,
        blob: new Blob([new Uint8Array(saved)], { type: 'application/pdf' }),
      })
    } catch (err) {
      notes.push(`Skipped ${file.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return { outputs, notes: notes.length ? notes : undefined }
}
