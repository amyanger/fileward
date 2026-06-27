export type WatermarkLayout = 'center' | 'tile'

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
