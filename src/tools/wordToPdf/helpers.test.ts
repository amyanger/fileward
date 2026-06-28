import { describe, it, expect } from 'vitest'
import { isDocx, PAGE_SIZES } from './helpers'

function bytesOf(...nums: number[]): ArrayBuffer {
  return new Uint8Array(nums).buffer
}

describe('isDocx', () => {
  it('accepts a zip (PK\\x03\\x04) signature', () => {
    expect(isDocx(bytesOf(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00))).toBe(true)
  })
  it('rejects a legacy .doc OLE header', () => {
    expect(isDocx(bytesOf(0xd0, 0xcf, 0x11, 0xe0))).toBe(false)
  })
  it('rejects input shorter than 4 bytes', () => {
    expect(isDocx(bytesOf(0x50, 0x4b))).toBe(false)
  })
})

describe('PAGE_SIZES', () => {
  it('uses US Letter points', () => {
    expect(PAGE_SIZES.letter).toEqual([612, 792])
  })
  it('uses A4 points', () => {
    expect(PAGE_SIZES.a4).toEqual([595.28, 841.89])
  })
})

import { parseBlocks } from './helpers'

describe('parseBlocks', () => {
  it('maps headings and paragraphs with bold/italic runs', () => {
    const blocks = parseBlocks('<h1>Title</h1><p>Hello <strong>bold</strong> <em>it</em></p>')
    expect(blocks[0]).toEqual({ type: 'heading', level: 1, runs: [{ text: 'Title', bold: false, italic: false }] })
    expect(blocks[1].type).toBe('paragraph')
    const runs = (blocks[1] as { runs: { text: string; bold: boolean; italic: boolean }[] }).runs
    expect(runs.some((r) => r.text.includes('bold') && r.bold)).toBe(true)
    expect(runs.some((r) => r.text.includes('it') && r.italic)).toBe(true)
  })

  it('numbers ordered lists and bullets unordered lists', () => {
    const ol = parseBlocks('<ol><li>a</li><li>b</li></ol>')
    expect(ol.map((b) => (b as { marker: string }).marker)).toEqual(['1.', '2.'])
    const ul = parseBlocks('<ul><li>x</li></ul>')
    expect((ul[0] as { marker: string }).marker).toBe('•')
  })

  it('emits an image block from a data-url img', () => {
    const blocks = parseBlocks('<p><img src="data:image/png;base64,AAAA"></p>')
    expect(blocks[0]).toEqual({ type: 'image', dataUrl: 'data:image/png;base64,AAAA' })
  })

  it('flattens table rows into paragraphs', () => {
    const blocks = parseBlocks('<table><tr><td>a</td><td>b</td></tr></table>')
    expect(blocks[0].type).toBe('paragraph')
    expect((blocks[0] as { runs: { text: string }[] }).runs[0].text).toBe('a   b')
  })
})

import { PDFDocument } from 'pdf-lib'
import { layoutTextPdf, buildImagePdf } from './helpers'

// 1x1 transparent PNG.
const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

describe('layoutTextPdf', () => {
  it('produces a one-page Letter PDF for short content', async () => {
    const bytes = await layoutTextPdf('<h1>Hi</h1><p>Short body.</p>', 'letter')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1)
    const { width, height } = doc.getPage(0).getSize()
    expect(Math.round(width)).toBe(612)
    expect(Math.round(height)).toBe(792)
  })

  it('paginates long content onto multiple pages', async () => {
    const longHtml = '<p>' + 'word '.repeat(4000) + '</p>'
    const doc = await PDFDocument.load(await layoutTextPdf(longHtml, 'a4'))
    expect(doc.getPageCount()).toBeGreaterThan(1)
  })
})

describe('buildImagePdf', () => {
  it('makes one page per raster image at the given point size', async () => {
    const bytes = await buildImagePdf([
      { dataUrl: PNG_1PX, widthPt: 200, heightPt: 300 },
      { dataUrl: PNG_1PX, widthPt: 200, heightPt: 300 },
    ])
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(2)
    expect(Math.round(doc.getPage(0).getSize().width)).toBe(200)
  })
})
