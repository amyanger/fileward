import { describe, it, expect } from 'vitest'
import { PDFDocument, degrees } from 'pdf-lib'
import { organizePages } from './transform'
import type { InputFile } from '../../types'

async function makePdf(pages: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([300, 400])
  const bytes = await doc.save()
  // `as ArrayBuffer`: slice() is typed ArrayBufferLike and fails strict tsc -b.
  return bytes.buffer.slice(0) as ArrayBuffer
}

function asInput(buf: ArrayBuffer): InputFile {
  return { id: '1', name: 'a.pdf', bytes: buf, type: 'application/pdf' }
}

describe('organizePages', () => {
  it('reorders and drops pages per ops', async () => {
    const res = await organizePages([asInput(await makePdf(3))], {
      ops: [{ srcPageIndex: 2, rotation: 0 }, { srcPageIndex: 0, rotation: 0 }],
    })
    const out = await PDFDocument.load(await res.outputs[0].blob.arrayBuffer())
    expect(out.getPageCount()).toBe(2)
    expect(res.outputs[0].name).toBe('a-organized.pdf')
  })

  it('applies rotation to a copied page', async () => {
    const res = await organizePages([asInput(await makePdf(1))], {
      ops: [{ srcPageIndex: 0, rotation: 90 }],
    })
    const out = await PDFDocument.load(await res.outputs[0].blob.arrayBuffer())
    expect(out.getPage(0).getRotation().angle).toBe(degrees(90).angle)
  })

  it('throws when no pages are selected', async () => {
    await expect(
      organizePages([asInput(await makePdf(2))], { ops: [] }),
    ).rejects.toThrow('No pages selected')
  })
})
