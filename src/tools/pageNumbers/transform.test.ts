import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { addPageNumbers } from './transform'
import type { InputFile } from '../../types'

async function makePdf(pages: number): Promise<InputFile> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([600, 800])
  const bytes = await doc.save()
  return { id: 'x', name: 'doc.pdf', bytes: bytes.buffer.slice(0) as ArrayBuffer, type: 'application/pdf' }
}

describe('addPageNumbers', () => {
  it('returns one numbered PDF preserving the page count', async () => {
    const res = await addPageNumbers([await makePdf(3)], {
      position: 'bottom-center',
      format: 'slash',
      startAt: 1,
      fontSize: 12,
      margin: 24,
    })
    expect(res.outputs).toHaveLength(1)
    expect(res.outputs[0].name).toBe('doc-numbered.pdf')
    const out = await PDFDocument.load(new Uint8Array(await res.outputs[0].blob.arrayBuffer()))
    expect(out.getPageCount()).toBe(3)
  })

  it('reports a skip note for an invalid PDF instead of throwing', async () => {
    const bad: InputFile = {
      id: 'b', name: 'bad.pdf', bytes: new Uint8Array([1, 2, 3]).buffer, type: 'application/pdf',
    }
    const res = await addPageNumbers([bad], {
      position: 'bottom-right', format: 'plain', startAt: 1, fontSize: 12, margin: 24,
    })
    expect(res.outputs).toHaveLength(0)
    expect(res.notes?.[0]).toMatch(/Skipped bad\.pdf/)
  })
})
