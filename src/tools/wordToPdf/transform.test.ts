import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { wordToPdf, type WordToPdfDeps, type WordToPdfOptions } from './transform'
import type { InputFile } from '../../types'

const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function docxFile(name = 'doc.docx'): InputFile {
  // PK\x03\x04 + filler so isDocx passes.
  return { id: '1', name, bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]).buffer, type: 'docx' }
}

const textOpts: WordToPdfOptions = { mode: 'text', paperSize: 'letter', scale: 2 }
const imageOpts: WordToPdfOptions = { mode: 'image', paperSize: 'letter', scale: 2 }

const deps = (over: Partial<WordToPdfDeps> = {}): WordToPdfDeps => ({
  docxToHtml: async () => ({ html: '<h1>Hi</h1><p>Body</p>', messages: [] }),
  renderImagePages: async () => [{ dataUrl: PNG_1PX, widthPt: 200, heightPt: 300 }],
  ...over,
})

describe('wordToPdf', () => {
  it('text mode renders a selectable-text PDF named <base>.pdf', async () => {
    const res = await wordToPdf([docxFile()], textOpts, deps())
    expect(res.outputs).toHaveLength(1)
    expect(res.outputs[0].name).toBe('doc.pdf')
    expect(res.outputs[0].blob.type).toBe('application/pdf')
    const pdf = await PDFDocument.load(await res.outputs[0].blob.arrayBuffer())
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1)
  })

  it('surfaces mammoth conversion messages as notes', async () => {
    const res = await wordToPdf([docxFile()], textOpts, deps({
      docxToHtml: async () => ({ html: '<p>x</p>', messages: ['Unrecognized style: Foo'] }),
    }))
    expect(res.notes?.some((n) => n.includes('Unrecognized style: Foo'))).toBe(true)
  })

  it('image mode embeds rendered pages at their point size', async () => {
    const res = await wordToPdf([docxFile()], imageOpts, deps())
    const pdf = await PDFDocument.load(await res.outputs[0].blob.arrayBuffer())
    expect(Math.round(pdf.getPage(0).getSize().width)).toBe(200)
  })

  it('skips a legacy .doc with a helpful note and no output', async () => {
    const legacy: InputFile = { id: '2', name: 'old.doc', bytes: new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]).buffer, type: 'doc' }
    const res = await wordToPdf([legacy], textOpts, deps())
    expect(res.outputs).toHaveLength(0)
    expect(res.notes?.[0]).toMatch(/legacy \.doc/)
  })

  it('collects a per-file error into notes instead of throwing', async () => {
    const res = await wordToPdf([docxFile('boom.docx')], imageOpts, deps({
      renderImagePages: async () => {
        throw new Error('render failed')
      },
    }))
    expect(res.outputs).toHaveLength(0)
    expect(res.notes?.[0]).toMatch(/Skipped boom\.docx: render failed/)
  })
})
