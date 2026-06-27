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
    // Capture the size up front: pdf.js detaches the input ArrayBuffer during
    // rasterize, so reading file.bytes.byteLength afterwards would give 0.
    const before = file.bytes.byteLength
    try {
      const rasters = await deps.rasterize(file.bytes, opts.scale, opts.quality)
      const out = await PDFDocument.create()
      for (const r of rasters) {
        const img = await out.embedJpg(new Uint8Array(r.jpeg))
        const page = out.addPage([r.width, r.height])
        page.drawImage(img, { x: 0, y: 0, width: r.width, height: r.height })
      }
      const saved = await out.save()
      const after = saved.byteLength
      const pct = before > 0 ? Math.round((1 - after / before) * 100) : 0
      if (pct > 0) {
        notes.push(`${file.name}: ${formatBytes(before)} → ${formatBytes(after)} (${pct}% smaller)`)
      } else if (pct === 0) {
        notes.push(`${file.name}: no size change (${formatBytes(before)}).`)
      } else {
        notes.push(
          `${file.name}: couldn't shrink (re-encoding grew it from ${formatBytes(before)} to ${formatBytes(after)}); text-based PDFs may not benefit.`,
        )
      }
      outputs.push({
        name: `${base}-compressed.pdf`,
        blob: new Blob([new Uint8Array(saved)], { type: 'application/pdf' }),
      })
    } catch (err) {
      notes.push(`Skipped ${file.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return { outputs, notes }
}
