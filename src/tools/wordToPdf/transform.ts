import type { InputFile, ToolResult } from '../../types'
import { isDocx, layoutTextPdf, buildImagePdf, type PaperSize, type RasterPage } from './helpers'

export type ConversionMode = 'text' | 'image'

export interface WordToPdfOptions {
  mode: ConversionMode
  paperSize: PaperSize
  scale: number
}

export interface WordToPdfDeps {
  docxToHtml(bytes: ArrayBuffer): Promise<{ html: string; messages: string[] }>
  renderImagePages(bytes: ArrayBuffer, scale: number): Promise<RasterPage[]>
}

export async function wordToPdf(
  files: InputFile[],
  opts: WordToPdfOptions,
  deps: WordToPdfDeps,
): Promise<ToolResult> {
  const outputs: ToolResult['outputs'] = []
  const notes: string[] = []
  for (const file of files) {
    const base = file.name.replace(/\.[^.]+$/, '')
    if (!isDocx(file.bytes)) {
      notes.push(`Skipped ${file.name}: legacy .doc isn't supported — save as .docx in Word first`)
      continue
    }
    try {
      let pdfBytes: Uint8Array
      if (opts.mode === 'image') {
        const pages = await deps.renderImagePages(file.bytes, opts.scale)
        if (!pages.length) throw new Error('no pages were rendered')
        pdfBytes = await buildImagePdf(pages)
      } else {
        const { html, messages } = await deps.docxToHtml(file.bytes)
        pdfBytes = await layoutTextPdf(html, opts.paperSize)
        for (const m of messages) notes.push(`${file.name}: ${m}`)
      }
      outputs.push({
        name: `${base}.pdf`,
        blob: new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' }),
      })
    } catch (err) {
      notes.push(`Skipped ${file.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return { outputs, notes: notes.length ? notes : undefined }
}
