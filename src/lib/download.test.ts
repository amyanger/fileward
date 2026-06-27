import { describe, it, expect, vi, beforeEach } from 'vitest'
import { downloadOutputs } from './download'

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
