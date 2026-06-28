export type WatermarkLayout = 'center' | 'tile'

/**
 * Parse a CSS hex color (`#rgb`, `#rrggbb`, with or without `#`) into pdf-lib's
 * 0..1 channel range. Falls back to mid-gray on anything unparseable so a bad
 * value can never crash the transform.
 */
export function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const gray = { r: 0.5, g: 0.5, b: 0.5 }
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) h = h.replace(/./g, (c) => c + c)
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return gray
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  }
}

export function centerOrigin(
  pageW: number,
  pageH: number,
  textW: number,
  fontSize: number,
  angleDeg: number,
): { x: number; y: number } {
  const t = (angleDeg * Math.PI) / 180
  return {
    x: pageW / 2 - (Math.cos(t) * textW) / 2,
    y: pageH / 2 - (Math.sin(t) * textW) / 2 - fontSize / 2,
  }
}

export function tileOrigins(
  pageW: number,
  pageH: number,
  stepX: number,
  stepY: number,
): { x: number; y: number }[] {
  const origins: { x: number; y: number }[] = []
  for (let y = stepY / 2; y < pageH; y += stepY) {
    for (let x = stepX / 2; x < pageW; x += stepX) {
      origins.push({ x, y })
    }
  }
  return origins
}
