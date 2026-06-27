import { describe, it, expect, beforeAll, vi } from 'vitest'
import { convertImages } from './transform'
import type { InputFile } from '../../types'

// jsdom lacks canvas encoding; stub the bits convertImages relies on.
beforeAll(() => {
  vi.stubGlobal('createImageBitmap', async () => ({ width: 10, height: 8, close() {} }))
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      width: number
      height: number
      constructor(w: number, h: number) {
        this.width = w
        this.height = h
      }
      getContext() {
        return { drawImage() {} }
      }
      async convertToBlob(opts: { type: string }) {
        return new Blob(['data'], { type: opts.type })
      }
    },
  )
})

function png(name: string): InputFile {
  return { id: name, name, bytes: new ArrayBuffer(4), type: 'image/png' }
}

describe('convertImages', () => {
  it('converts each image and renames extension', async () => {
    const res = await convertImages([png('a.png'), png('b.png')], {
      format: 'image/jpeg',
      quality: 0.8,
    })
    expect(res.outputs).toHaveLength(2)
    expect(res.outputs[0].name).toBe('a.jpg')
    expect(res.outputs[0].blob.type).toBe('image/jpeg')
  })

  it('scales down when maxWidth is set', async () => {
    const res = await convertImages([png('a.png')], {
      format: 'image/webp',
      quality: 0.9,
      maxWidth: 5,
    })
    expect(res.outputs[0].name).toBe('a.webp')
  })
})
