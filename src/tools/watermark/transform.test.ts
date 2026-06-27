import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { addWatermark } from './transform'
import type { InputFile } from '../../types'

async function makePdf(pages: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([300, 400])
  const bytes = await doc.save()
  // pdf-lib save() returns a Uint8Array over a fresh buffer (byteOffset 0).
  // `as ArrayBuffer` matches the proven pageNumbers test — slice() is typed
  // ArrayBufferLike, which fails strict `tsc -b` against InputFile.bytes.
  return bytes.buffer.slice(0) as ArrayBuffer
}

function asInput(buf: ArrayBuffer, name = 'a.pdf'): InputFile {
  return { id: '1', name, bytes: buf, type: 'application/pdf' }
}

describe('addWatermark', () => {
  it('produces one watermarked pdf per input, preserving page count', async () => {
    const res = await addWatermark([asInput(await makePdf(3))], {
      text: 'CONFIDENTIAL', opacity: 0.15, angle: 45, fontSize: 24, layout: 'center',
    })
    expect(res.outputs).toHaveLength(1)
    expect(res.outputs[0].name).toBe('a-watermarked.pdf')
    const out = await PDFDocument.load(await res.outputs[0].blob.arrayBuffer())
    expect(out.getPageCount()).toBe(3)
  })

  it('tile layout also yields a valid pdf', async () => {
    const res = await addWatermark([asInput(await makePdf(1), 'b.pdf')], {
      text: 'DRAFT', opacity: 0.2, angle: 30, fontSize: 18, layout: 'tile',
    })
    const out = await PDFDocument.load(await res.outputs[0].blob.arrayBuffer())
    expect(out.getPageCount()).toBe(1)
  })

  it('records a note and skips an unreadable file', async () => {
    const bad = new TextEncoder().encode('not a pdf')
    const res = await addWatermark([asInput(bad.buffer, 'bad.pdf')], {
      text: 'X', opacity: 0.15, angle: 45, fontSize: 24, layout: 'center',
    })
    expect(res.outputs).toHaveLength(0)
    expect(res.notes?.[0]).toContain('bad.pdf')
  })
})
