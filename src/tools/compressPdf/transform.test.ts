import { describe, it, expect, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { compressPdf } from './transform'
import type { InputFile } from '../../types'

// minimal valid JPEG bytes (1x1 white pixel) for embedJpg
const JPEG_1x1 = Uint8Array.from(
  atob(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=',
  ),
  (c) => c.charCodeAt(0),
)

function pdf(name: string, size: number): InputFile {
  return { id: name, name, bytes: new ArrayBuffer(size), type: 'application/pdf' }
}

describe('compressPdf', () => {
  it('rebuilds a PDF from rasterized pages and reports sizes', async () => {
    const deps = {
      rasterize: vi.fn(async () => [
        { width: 50, height: 50, jpeg: JPEG_1x1.buffer.slice(0) },
        { width: 50, height: 50, jpeg: JPEG_1x1.buffer.slice(0) },
      ]),
    }
    const res = await compressPdf([pdf('big.pdf', 1_000_000)], { quality: 0.6, scale: 1.5 }, deps)
    expect(res.outputs[0].name).toBe('big-compressed.pdf')
    const doc = await PDFDocument.load(new Uint8Array(await res.outputs[0].blob.arrayBuffer()))
    expect(doc.getPageCount()).toBe(2)
    expect(res.notes?.[0]).toMatch(/big\.pdf/)
  })

  it('reports the original size even when rasterize detaches the input buffer', async () => {
    // pdf.js takes ownership of the data buffer; emulate detachment here.
    const deps = {
      rasterize: vi.fn(async (bytes: ArrayBuffer) => {
        void structuredClone(bytes, { transfer: [bytes] }) // detach, like pdf.js does
        return [{ width: 50, height: 50, jpeg: JPEG_1x1.buffer.slice(0) }]
      }),
    }
    const res = await compressPdf([pdf('scan.pdf', 2_000_000)], { quality: 0.6, scale: 1.5 }, deps)
    // ~1.9 MB original (1024-based) → note must reflect the real size, not "0 B"
    expect(res.notes?.[0]).toMatch(/1\.9 MB/)
    expect(res.notes?.[0]).not.toMatch(/0 B/)
  })
})
