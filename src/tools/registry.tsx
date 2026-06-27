import type { ReactNode } from 'react'
import type { ToolDef } from '../types'
import type { PanelProps } from '../components/ToolPage'
import { ImageConvertPanel } from './imageConvert/Panel'
import { ImagesToPdfPanel } from './imagesToPdf/Panel'
import { PdfToImagesPanel } from './pdfToImages/Panel'
import { MergeSplitPanel } from './mergeSplit/Panel'
import { CompressPdfPanel } from './compressPdf/Panel'
import { PageNumbersPanel } from './pageNumbers/Panel'
import { WatermarkPanel } from './watermark/Panel'

export interface ToolEntry {
  def: ToolDef
  renderPanel: (props: PanelProps) => ReactNode
}

export const TOOLS: ToolEntry[] = [
  {
    def: { id: 'merge-split', title: 'Merge & Split PDFs', description: 'Combine PDFs or pull out a page range.', accept: 'application/pdf' },
    renderPanel: (p) => <MergeSplitPanel {...p} />,
  },
  {
    def: { id: 'compress-pdf', title: 'Compress PDF', description: 'Shrink large or scanned PDFs.', accept: 'application/pdf' },
    renderPanel: (p) => <CompressPdfPanel {...p} />,
  },
  {
    def: { id: 'page-numbers', title: 'Add Page Numbers', description: 'Stamp page numbers onto a PDF.', accept: 'application/pdf' },
    renderPanel: (p) => <PageNumbersPanel {...p} />,
  },
  {
    def: { id: 'watermark', title: 'Watermark PDF', description: 'Overlay text like CONFIDENTIAL across pages.', accept: 'application/pdf' },
    renderPanel: (p) => <WatermarkPanel {...p} />,
  },
  {
    def: { id: 'images-to-pdf', title: 'Images → PDF', description: 'Turn photos or scans into one PDF.', accept: 'image/*' },
    renderPanel: (p) => <ImagesToPdfPanel {...p} />,
  },
  {
    def: { id: 'pdf-to-images', title: 'PDF → Images', description: 'Export PDF pages as PNG or JPG.', accept: 'application/pdf' },
    renderPanel: (p) => <PdfToImagesPanel {...p} />,
  },
  {
    def: { id: 'image-convert', title: 'Compress & Convert Images', description: 'Resize and convert PNG/JPG/WebP.', accept: 'image/*' },
    renderPanel: (p) => <ImageConvertPanel {...p} />,
  },
]
