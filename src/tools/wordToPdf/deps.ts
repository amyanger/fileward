import type { InputFile, ToolResult } from '../../types'
import { wordToPdf, type WordToPdfOptions, type WordToPdfDeps } from './transform'
import type { RasterPage } from './helpers'

const PT_PER_PX = 72 / 96 // CSS px → PDF points

/** Off-screen but laid-out container (NOT display:none, so it has real geometry). */
function makeHiddenContainer(): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;left:-99999px;top:0;width:auto;'
  document.body.appendChild(el)
  return el
}

const realDeps: WordToPdfDeps = {
  async docxToHtml(bytes) {
    const mammoth = await import('mammoth')
    const { value, messages } = await mammoth.convertToHtml({ arrayBuffer: bytes })
    return { html: value, messages: messages.map((m) => m.message) }
  },

  async renderImagePages(bytes, scale) {
    const { renderAsync } = await import('docx-preview')
    const html2canvas = (await import('html2canvas')).default
    const container = makeHiddenContainer()
    try {
      await renderAsync(new Blob([bytes]), container, undefined, {
        className: 'docx',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
      })
      // docx-preview emits one <section> per page. Verify this selector in Safari (Task 7).
      const sections = Array.from(container.querySelectorAll('section'))
      const pages: RasterPage[] = []
      for (const section of sections) {
        const canvas = await html2canvas(section as HTMLElement, {
          scale,
          useCORS: true,
          backgroundColor: '#ffffff',
        })
        const rect = (section as HTMLElement).getBoundingClientRect()
        pages.push({
          dataUrl: canvas.toDataURL('image/jpeg', 0.92),
          widthPt: rect.width * PT_PER_PX,
          heightPt: rect.height * PT_PER_PX,
        })
        await new Promise((r) => setTimeout(r)) // yield so the UI stays alive
      }
      return pages
    } finally {
      container.remove()
    }
  },
}

export function convertWordToPdf(files: InputFile[], options: WordToPdfOptions): Promise<ToolResult> {
  return wordToPdf(files, options, realDeps)
}
