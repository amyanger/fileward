import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { parsePageRange, mergeOrSplit } from './transform'
import type { InputFile } from '../../types'

describe('parsePageRange', () => {
  it('parses single pages, ranges, and commas (1-based input → 0-based output)', () => {
    expect(parsePageRange('1,3-5', 10)).toEqual([0, 2, 3, 4])
  })
  it('clamps and ignores out-of-range', () => {
    expect(parsePageRange('2-99', 3)).toEqual([1, 2])
  })
  it('throws on empty result', () => {
    expect(() => parsePageRange('50-60', 3)).toThrow()
  })
})

async function makePdf(pages: number, name: string): Promise<InputFile> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([100, 100])
  const bytes = await doc.save()
  return { id: name, name, bytes: bytes.buffer.slice(0) as ArrayBuffer, type: 'application/pdf' }
}

describe('mergeOrSplit', () => {
  it('merges page counts across files', async () => {
    const res = await mergeOrSplit([await makePdf(2, 'a.pdf'), await makePdf(3, 'b.pdf')], {
      mode: 'merge',
    })
    const doc = await PDFDocument.load(new Uint8Array(await res.outputs[0].blob.arrayBuffer()))
    expect(doc.getPageCount()).toBe(5)
    expect(res.outputs[0].name).toBe('merged.pdf')
  })

  it('extracts a page range from the first file', async () => {
    const res = await mergeOrSplit([await makePdf(6, 'a.pdf')], {
      mode: 'extract',
      range: '2-4',
    })
    const doc = await PDFDocument.load(new Uint8Array(await res.outputs[0].blob.arrayBuffer()))
    expect(doc.getPageCount()).toBe(3)
    expect(res.outputs[0].name).toBe('extracted.pdf')
  })
})
