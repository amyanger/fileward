import type { InputFile, ToolResult } from '../../types'

export interface PdfToImagesOptions {
  format: 'image/png' | 'image/jpeg'
  scale: number
}

export interface PdfRenderDeps {
  pageCount(bytes: ArrayBuffer): Promise<number>
  renderPage(
    bytes: ArrayBuffer,
    pageNo: number,
    scale: number,
    format: string,
  ): Promise<Blob>
}

const EXT: Record<PdfToImagesOptions['format'], string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
}

export async function pdfToImages(
  files: InputFile[],
  opts: PdfToImagesOptions,
  deps: PdfRenderDeps,
): Promise<ToolResult> {
  const outputs = []
  for (const file of files) {
    const base = file.name.replace(/\.[^.]+$/, '')
    const pages = await deps.pageCount(file.bytes)
    for (let p = 1; p <= pages; p++) {
      const blob = await deps.renderPage(file.bytes, p, opts.scale, opts.format)
      outputs.push({ name: `${base}-p${p}.${EXT[opts.format]}`, blob })
    }
  }
  return { outputs }
}
