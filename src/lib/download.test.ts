import { describe, it, expect, vi, beforeEach } from 'vitest'
import { downloadOutputs } from './download'

// client-zip streams via Response/ReadableStream, which overflows the stack
// under jsdom (works fine in real browsers — verified manually). Mock it so the
// test exercises downloadOutputs' own logic, not client-zip's internals.
vi.mock('client-zip', () => ({
  downloadZip: (files: { name: string }[]) => ({
    blob: async () => new Blob([`zip:${files.map((f) => f.name).join(',')}`]),
  }),
}))

describe('downloadOutputs', () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:x')
    globalThis.URL.revokeObjectURL = vi.fn()
  })
  it('triggers a single download for one output', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await downloadOutputs([{ name: 'a.pdf', blob: new Blob(['x']) }])
    expect(click).toHaveBeenCalledTimes(1)
  })
  it('zips multiple outputs into one download', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await downloadOutputs([
      { name: 'a.pdf', blob: new Blob(['x']) },
      { name: 'b.pdf', blob: new Blob(['y']) },
    ])
    expect(click).toHaveBeenCalledTimes(1)
  })
})
