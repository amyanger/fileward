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
