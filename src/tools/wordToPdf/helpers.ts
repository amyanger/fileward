import { PDFDocument, StandardFonts, type PDFFont, type PDFImage } from 'pdf-lib'

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

export interface Run {
  text: string
  bold: boolean
  italic: boolean
}

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; runs: Run[] }
  | { type: 'paragraph'; runs: Run[] }
  | { type: 'listitem'; marker: string; runs: Run[] }
  | { type: 'image'; dataUrl: string }

function collectRuns(node: Node, bold: boolean, italic: boolean, out: Run[]): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3) {
      const text = (child.textContent ?? '').replace(/\s+/g, ' ')
      if (text) out.push({ text, bold, italic })
    } else if (child.nodeType === 1) {
      const tag = (child as Element).tagName.toLowerCase()
      collectRuns(child, bold || tag === 'strong' || tag === 'b', italic || tag === 'em' || tag === 'i', out)
    }
  }
}

function runsOf(el: Element): Run[] {
  const out: Run[] = []
  collectRuns(el, false, false, out)
  return out
}

function walk(root: Element, out: Block[]): void {
  for (const el of Array.from(root.children)) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      out.push({ type: 'heading', level: Number(tag[1]) as 1 | 2 | 3, runs: runsOf(el) })
    } else if (tag === 'p') {
      const img = el.querySelector('img')
      const src = img?.getAttribute('src')
      if (src) out.push({ type: 'image', dataUrl: src })
      const runs = runsOf(el)
      if (runs.some((r) => r.text.trim())) out.push({ type: 'paragraph', runs })
    } else if (tag === 'ul' || tag === 'ol') {
      let n = 1
      for (const li of Array.from(el.children)) {
        if (li.tagName.toLowerCase() !== 'li') continue
        out.push({ type: 'listitem', marker: tag === 'ol' ? `${n++}.` : '•', runs: runsOf(li) })
      }
    } else if (tag === 'img') {
      const src = el.getAttribute('src')
      if (src) out.push({ type: 'image', dataUrl: src })
    } else if (tag === 'table') {
      for (const tr of Array.from(el.querySelectorAll('tr'))) {
        const cells = Array.from(tr.children)
          .map((td) => (td.textContent ?? '').trim())
          .filter(Boolean)
        if (cells.length) out.push({ type: 'paragraph', runs: [{ text: cells.join('   '), bold: false, italic: false }] })
      }
    } else {
      walk(el, out) // recurse into wrappers (div, section, article, …)
    }
  }
}

export function parseBlocks(html: string): Block[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const blocks: Block[] = []
  walk(doc.body, blocks)
  return blocks
}

const MARGIN = 56 // ~0.75in

async function embedDataUrl(doc: PDFDocument, dataUrl: string): Promise<PDFImage | null> {
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(dataUrl)
  if (!m) return null
  const raw = atob(m[2])
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0))
  return /png/i.test(m[1]) ? doc.embedPng(bytes) : doc.embedJpg(bytes)
}

interface Fonts {
  regular: PDFFont
  bold: PDFFont
  italic: PDFFont
  boldItalic: PDFFont
}

function pickFont(fonts: Fonts, bold: boolean, italic: boolean): PDFFont {
  if (bold && italic) return fonts.boldItalic
  if (bold) return fonts.bold
  if (italic) return fonts.italic
  return fonts.regular
}

/** Greedy word-wrap a run list into lines; each line is a list of styled segments. */
function wrapRuns(runs: Run[], fonts: Fonts, forceBold: boolean, size: number, maxW: number): Run[][] {
  const lines: Run[][] = [[]]
  let lineW = 0
  for (const run of runs) {
    const bold = run.bold || forceBold
    const font = pickFont(fonts, bold, run.italic)
    for (const word of run.text.split(/(\s+)/)) {
      if (!word) continue
      const ww = font.widthOfTextAtSize(word, size)
      const isSpace = word.trim() === ''
      if (isSpace && lineW === 0) continue // drop leading space on a fresh line
      if (!isSpace && lineW > 0 && lineW + ww > maxW) {
        lines.push([])
        lineW = 0
      }
      const cur = lines[lines.length - 1]
      const last = cur[cur.length - 1]
      if (last && last.bold === bold && last.italic === run.italic) last.text += word
      else cur.push({ text: word, bold, italic: run.italic })
      lineW += ww
    }
  }
  return lines.filter((l) => l.length > 0)
}

export async function layoutTextPdf(html: string, paperSize: PaperSize): Promise<Uint8Array> {
  const blocks = parseBlocks(html)
  const doc = await PDFDocument.create()
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  }
  const [pw, ph] = PAGE_SIZES[paperSize]
  const maxW = pw - MARGIN * 2
  let page = doc.addPage([pw, ph])
  let y = ph - MARGIN
  const newPage = () => {
    page = doc.addPage([pw, ph])
    y = ph - MARGIN
  }

  for (const block of blocks) {
    if (block.type === 'image') {
      const img = await embedDataUrl(doc, block.dataUrl)
      if (img) {
        const scale = Math.min(1, maxW / img.width)
        const w = img.width * scale
        const h = img.height * scale
        if (y - h < MARGIN) newPage()
        page.drawImage(img, { x: MARGIN, y: y - h, width: w, height: h })
        y -= h + 8
      }
      continue
    }

    const isHeading = block.type === 'heading'
    const size = isHeading ? (block.level === 1 ? 20 : block.level === 2 ? 16 : 13) : 11
    const lineH = size * 1.4
    const indent = block.type === 'listitem' ? 18 : 0
    const after = isHeading ? 4 : 6
    if (isHeading) y -= 10 // space before headings

    const lines = wrapRuns(block.runs, fonts, isHeading, size, maxW - indent)
    lines.forEach((line, idx) => {
      if (y - lineH < MARGIN) newPage()
      if (idx === 0 && block.type === 'listitem') {
        page.drawText(block.marker, { x: MARGIN, y: y - size, size, font: fonts.regular })
      }
      let x = MARGIN + indent
      for (const seg of line) {
        const font = pickFont(fonts, seg.bold, seg.italic)
        page.drawText(seg.text, { x, y: y - size, size, font })
        x += font.widthOfTextAtSize(seg.text, size)
      }
      y -= lineH
    })
    y -= after
  }

  return doc.save()
}

export interface RasterPage {
  dataUrl: string
  widthPt: number
  heightPt: number
}

export async function buildImagePdf(pages: RasterPage[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (const p of pages) {
    const img = await embedDataUrl(doc, p.dataUrl)
    if (!img) continue
    const page = doc.addPage([p.widthPt, p.heightPt])
    page.drawImage(img, { x: 0, y: 0, width: p.widthPt, height: p.heightPt })
  }
  return doc.save()
}
