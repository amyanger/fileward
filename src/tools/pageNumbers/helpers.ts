export type PageNumberFormat = 'plain' | 'slash' | 'word'
export type PageNumberPosition =
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'top-left' | 'top-center' | 'top-right'

export function formatPageNumber(
  format: PageNumberFormat,
  pageNum: number,
  total: number,
): string {
  switch (format) {
    case 'slash':
      return `${pageNum} / ${total}`
    case 'word':
      return `Page ${pageNum}`
    default:
      return `${pageNum}`
  }
}

export function anchorXY(
  position: PageNumberPosition,
  pageW: number,
  pageH: number,
  textW: number,
  fontSize: number,
  margin: number,
): { x: number; y: number } {
  const isTop = position.startsWith('top-')
  const y = isTop ? pageH - margin - fontSize : margin
  let x: number
  if (position.endsWith('-left')) x = margin
  else if (position.endsWith('-right')) x = pageW - margin - textW
  else x = (pageW - textW) / 2
  return { x, y }
}
