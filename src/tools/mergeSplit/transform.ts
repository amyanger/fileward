import { PDFDocument } from 'pdf-lib'
import type { InputFile, ToolResult } from '../../types'

export type MergeSplitOptions = { mode: 'merge' } | { mode: 'extract'; range: string }

export function parsePageRange(range: string, pageCount: number): number[] {
  const indices = new Set<number>()
  for (const part of range.split(',')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const m = trimmed.match(/^(\d+)(?:-(\d+))?$/)
    if (!m) throw new Error(`Invalid page range: "${trimmed}"`)
    const start = parseInt(m[1], 10)
    const end = m[2] ? parseInt(m[2], 10) : start
    for (let p = start; p <= end; p++) {
      if (p >= 1 && p <= pageCount) indices.add(p - 1)
    }
  }
  const sorted = [...indices].sort((a, b) => a - b)
  if (sorted.length === 0) throw new Error('Page range selects no pages')
  return sorted
}

export async function mergeOrSplit(
  files: InputFile[],
  opts: MergeSplitOptions,
): Promise<ToolResult> {
  if (files.length === 0) throw new Error('No PDF files provided')
  const out = await PDFDocument.create()

  if (opts.mode === 'merge') {
    for (const file of files) {
      const src = await PDFDocument.load(new Uint8Array(file.bytes))
      const copied = await out.copyPages(src, src.getPageIndices())
      copied.forEach((p) => out.addPage(p))
    }
    const bytes = await out.save()
    return {
      outputs: [{ name: 'merged.pdf', blob: new Blob([bytes as unknown as ArrayBuffer], { type: 'application/pdf' }) }],
    }
  }

  const src = await PDFDocument.load(new Uint8Array(files[0].bytes))
  const idx = parsePageRange(opts.range, src.getPageCount())
  const copied = await out.copyPages(src, idx)
  copied.forEach((p) => out.addPage(p))
  const bytes = await out.save()
  return {
    outputs: [{ name: 'extracted.pdf', blob: new Blob([bytes as unknown as ArrayBuffer], { type: 'application/pdf' }) }],
  }
}
