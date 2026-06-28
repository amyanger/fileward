import { PDFDocument, degrees } from 'pdf-lib'
import type { InputFile, ToolResult } from '../../types'

export interface PageOp {
  srcPageIndex: number
  rotation: number
}

export interface OrganizePagesOptions {
  ops: PageOp[]
}

export async function organizePages(
  files: InputFile[],
  opts: OrganizePagesOptions,
): Promise<ToolResult> {
  if (opts.ops.length === 0) throw new Error('No pages selected — add at least one page.')
  const file = files[0]
  const base = file.name.replace(/\.[^.]+$/, '')
  const src = await PDFDocument.load(new Uint8Array(file.bytes))
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, opts.ops.map((o) => o.srcPageIndex))
  copied.forEach((page, i) => {
    const baseAngle = page.getRotation().angle
    page.setRotation(degrees(baseAngle + opts.ops[i].rotation))
    out.addPage(page)
  })
  const saved = await out.save()
  return {
    outputs: [
      {
        name: `${base}-organized.pdf`,
        blob: new Blob([new Uint8Array(saved)], { type: 'application/pdf' }),
      },
    ],
  }
}
