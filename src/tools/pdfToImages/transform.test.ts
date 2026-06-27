import { describe, it, expect, vi } from 'vitest'
import { pdfToImages } from './transform'
import type { InputFile } from '../../types'

function pdf(name: string): InputFile {
  return { id: name, name, bytes: new ArrayBuffer(8), type: 'application/pdf' }
}

describe('pdfToImages', () => {
  it('emits one image per page with indexed names', async () => {
    const deps = {
      pageCount: vi.fn(async () => 3),
      renderPage: vi.fn(async () => new Blob(['x'], { type: 'image/png' })),
    }
    const res = await pdfToImages([pdf('doc.pdf')], { format: 'image/png', scale: 2 }, deps)
    expect(res.outputs.map((o) => o.name)).toEqual(['doc-p1.png', 'doc-p2.png', 'doc-p3.png'])
    expect(deps.renderPage).toHaveBeenCalledTimes(3)
  })
})
