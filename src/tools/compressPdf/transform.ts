import { PDFDocument } from 'pdf-lib'
import type { InputFile, ToolResult } from '../../types'
import { formatBytes } from '../../lib/format'

export interface CompressPdfOptions {
  quality: number // 0..1 JPEG quality
  scale: number // render scale; lower = smaller
}

export interface PageRaster {
  width: number
  height: number
  jpeg: ArrayBuffer
}

export interface CompressDeps {
  rasterize(bytes: ArrayBuffer, scale: number, quality: number): Promise<PageRaster[]>
}

export async function compressPdf(
  files: InputFile[],
  opts: CompressPdfOptions,
  deps: CompressDeps,
): Promise<ToolResult> {
  const outputs = []
  const notes: string[] = []
  for (const file of files) {
    const base = file.name.replace(/\.[^.]+$/, '')
    const rasters = await deps.rasterize(file.bytes, opts.scale, opts.quality)
    const out = await PDFDocument.create()
    for (const r of rasters) {
      const img = await out.embedJpg(new Uint8Array(r.jpeg))
      const page = out.addPage([r.width, r.height])
      page.drawImage(img, { x: 0, y: 0, width: r.width, height: r.height })
    }
    const saved = await out.save()
    const before = file.bytes.byteLength
    const after = saved.byteLength
    const pct = before > 0 ? Math.round((1 - after / before) * 100) : 0
    notes.push(
      pct > 0
        ? `${file.name}: ${formatBytes(before)} → ${formatBytes(after)} (${pct}% smaller)`
        : `${file.name}: already small (${formatBytes(before)} → ${formatBytes(after)}); text-only PDFs may not shrink.`,
    )
    outputs.push({
      name: `${base}-compressed.pdf`,
      blob: new Blob([new Uint8Array(saved)], { type: 'application/pdf' }),
    })
  }
  return { outputs, notes }
}
