import type { InputFile, ToolResult } from '../../types'

export interface ImageConvertOptions {
  format: 'image/png' | 'image/jpeg' | 'image/webp'
  quality: number // 0..1, ignored for png
  maxWidth?: number
}

const EXT: Record<ImageConvertOptions['format'], string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

function renamed(name: string, ext: string): string {
  return name.replace(/\.[^.]+$/, '') + '.' + ext
}

export async function convertImages(
  files: InputFile[],
  opts: ImageConvertOptions,
): Promise<ToolResult> {
  const outputs = []
  const notes: string[] = []
  for (const file of files) {
    try {
      const bitmap = await createImageBitmap(new Blob([file.bytes], { type: file.type }))
      let { width, height } = bitmap
      if (opts.maxWidth && width > opts.maxWidth) {
        height = Math.round((height * opts.maxWidth) / width)
        width = opts.maxWidth
      }
      const canvas = new OffscreenCanvas(width, height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D context unavailable')
      ctx.drawImage(bitmap as unknown as CanvasImageSource, 0, 0, width, height)
      bitmap.close?.()
      const blob = await canvas.convertToBlob({ type: opts.format, quality: opts.quality })
      outputs.push({ name: renamed(file.name, EXT[opts.format]), blob })
    } catch (err) {
      notes.push(`Skipped ${file.name}: ${(err as Error).message}`)
    }
  }
  return { outputs, notes: notes.length ? notes : undefined }
}
