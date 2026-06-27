import { describe, it, expect, vi } from 'vitest'
import { pdfToImages } from './transform'
import type { InputFile } from '../../types'

function pdf(name: string): InputFile {
  return { id: name, name, bytes: new ArrayBuffer(8), type: 'application/pdf' }
}

describe('pdfToImages', () => {
  it('emits one image per page with indexed names', async () => {
    const blob = new Blob(['x'], { type: 'image/png' })
    const deps = {
      renderDocument: vi.fn(async () => [blob, blob, blob]),
    }
    const res = await pdfToImages([pdf('doc.pdf')], { format: 'image/png', scale: 2 }, deps)
    expect(res.outputs.map((o) => o.name)).toEqual(['doc-p1.png', 'doc-p2.png', 'doc-p3.png'])
    expect(deps.renderDocument).toHaveBeenCalledTimes(1)
  })

  it('skips a failing file and continues with the rest', async () => {
    const blob = new Blob(['x'], { type: 'image/png' })
    const deps = {
      renderDocument: vi
        .fn()
        .mockRejectedValueOnce(new Error('corrupt PDF'))
        .mockResolvedValue([blob, blob, blob]),
    }
    const res = await pdfToImages(
      [pdf('bad.pdf'), pdf('good.pdf')],
      { format: 'image/png', scale: 2 },
      deps,
    )
    expect(res.outputs.map((o) => o.name)).toEqual(['good-p1.png', 'good-p2.png', 'good-p3.png'])
    expect(res.notes).toEqual(['Skipped bad.pdf: corrupt PDF'])
    expect(deps.renderDocument).toHaveBeenCalledTimes(2)
  })
})
