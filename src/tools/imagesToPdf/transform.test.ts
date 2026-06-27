import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { imagesToPdf } from './transform'
import type { InputFile } from '../../types'

// Build a tiny valid PNG via pdf-lib is overkill; use a 1x1 PNG byte fixture.
const PNG_1x1 = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  ),
  (c) => c.charCodeAt(0),
)

function img(name: string): InputFile {
  return { id: name, name, bytes: PNG_1x1.buffer.slice(0), type: 'image/png' }
}

describe('imagesToPdf', () => {
  it('produces a single PDF with one page per image', async () => {
    const res = await imagesToPdf([img('a.png'), img('b.png')], {
      pageSize: 'fit',
      orientation: 'portrait',
    })
    expect(res.outputs).toHaveLength(1)
    expect(res.outputs[0].name).toBe('combined.pdf')
    const bytes = new Uint8Array(await res.outputs[0].blob.arrayBuffer())
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(2)
  })
})
