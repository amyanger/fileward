import { describe, it, expect } from 'vitest'
import { formatPageNumber, anchorXY } from './helpers'

describe('formatPageNumber', () => {
  it('plain shows just the number', () => {
    expect(formatPageNumber('plain', 3, 10)).toBe('3')
  })
  it('slash shows current / total', () => {
    expect(formatPageNumber('slash', 3, 10)).toBe('3 / 10')
  })
  it('word prefixes "Page"', () => {
    expect(formatPageNumber('word', 3, 10)).toBe('Page 3')
  })
})

describe('anchorXY', () => {
  const W = 600, H = 800, TW = 40, FS = 12, M = 24
  it('bottom-left sits at the margin', () => {
    expect(anchorXY('bottom-left', W, H, TW, FS, M)).toEqual({ x: 24, y: 24 })
  })
  it('bottom-center centers horizontally', () => {
    expect(anchorXY('bottom-center', W, H, TW, FS, M)).toEqual({ x: 280, y: 24 })
  })
  it('bottom-right hugs the right margin', () => {
    expect(anchorXY('bottom-right', W, H, TW, FS, M)).toEqual({ x: 536, y: 24 })
  })
  it('top-right drops below the top margin by one line', () => {
    expect(anchorXY('top-right', W, H, TW, FS, M)).toEqual({ x: 536, y: 764 })
  })
})
