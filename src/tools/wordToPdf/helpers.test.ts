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
