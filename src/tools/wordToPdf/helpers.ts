export type PaperSize = 'a4' | 'letter'

/** Page dimensions in PDF points (1pt = 1/72in). */
export const PAGE_SIZES: Record<PaperSize, [number, number]> = {
  letter: [612, 792],
  a4: [595.28, 841.89],
}

/** A .docx is a zip; zips start with the local-file-header magic "PK\x03\x04". */
export function isDocx(bytes: ArrayBuffer): boolean {
  if (bytes.byteLength < 4) return false
  const b = new Uint8Array(bytes, 0, 4)
  return b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04
}
