import { describe, it, expect } from 'vitest'
import { centerOrigin, tileOrigins } from './helpers'

describe('centerOrigin', () => {
  it('at 0° centers the baseline horizontally and drops half a line below mid', () => {
    // pageW/2 - textW/2 = 300 - 100 = 200; pageH/2 - 0 - fontSize/2 = 400 - 24 = 376
    expect(centerOrigin(600, 800, 200, 48, 0)).toEqual({ x: 200, y: 376 })
  })
  it('at 90° steps back in y by textW/2', () => {
    // cos90≈0 so x = 300; sin90≈1 so y = 400 - 100 - 24 = 276
    const o = centerOrigin(600, 800, 200, 48, 90)
    expect(o.x).toBeCloseTo(300, 6)
    expect(o.y).toBeCloseTo(276, 6)
  })
})

describe('tileOrigins', () => {
  it('lays a grid starting at half-step, stepping by step within bounds', () => {
    expect(tileOrigins(400, 300, 200, 150)).toEqual([
      { x: 100, y: 75 },
      { x: 300, y: 75 },
      { x: 100, y: 225 },
      { x: 300, y: 225 },
    ])
  })
})
