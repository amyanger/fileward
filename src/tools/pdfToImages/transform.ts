import type { InputFile, ToolResult } from '../../types'

export interface PdfToImagesOptions {
  format: 'image/png' | 'image/jpeg'
  scale: number
}

export interface PdfRenderDeps {
  renderDocument(bytes: ArrayBuffer, scale: number, format: string): Promise<Blob[]>
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
  const notes: string[] = []
  for (const file of files) {
    const base = file.name.replace(/\.[^.]+$/, '')
    try {
      const blobs = await deps.renderDocument(file.bytes, opts.scale, opts.format)
      for (let i = 0; i < blobs.length; i++) {
        outputs.push({ name: `${base}-p${i + 1}.${EXT[opts.format]}`, blob: blobs[i] })
      }
    } catch (err) {
      notes.push(`Skipped ${file.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return { outputs, notes: notes.length ? notes : undefined }
}
