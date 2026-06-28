import { useState } from 'react'
import type { PanelProps } from '../../components/ToolPage'
import type { ConversionMode } from './transform'
import type { PaperSize } from './helpers'
import { convertWordToPdf } from './deps'

export function WordToPdfPanel({ files, busy, onRun }: PanelProps) {
  const [mode, setMode] = useState<ConversionMode>('text')
  const [paperSize, setPaperSize] = useState<PaperSize>('letter')
  const [scale, setScale] = useState(2)

  return (
    <div className="space-y-3">
      <label className="field-label">
        Output
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as ConversionMode)}
          className="field-input"
        >
          <option value="text">Selectable text — searchable, small files</option>
          <option value="image">Looks like Word — pixel-faithful, not selectable</option>
        </select>
      </label>

      {mode === 'text' ? (
        <label className="field-label">
          Paper size
          <select
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value as PaperSize)}
            className="field-input"
          >
            <option value="letter">US Letter</option>
            <option value="a4">A4</option>
          </select>
        </label>
      ) : (
        <label className="field-label">
          Quality: {scale}×
          <input
            type="range" min={1} max={3} step={1}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="range-input"
          />
        </label>
      )}

      <p className="text-sm text-muted">
        {mode === 'text'
          ? 'Best for text you want to select or search. Fonts, tables, and exact spacing are simplified.'
          : 'Best when it must look exactly like Word. Larger file; text is an image and not selectable.'}
      </p>

      <button
        disabled={busy || files.length === 0}
        onClick={() => onRun(() => convertWordToPdf(files, { mode, paperSize, scale }))}
        className="btn-primary"
      >
        {busy ? 'Converting…' : 'Convert to PDF'}
      </button>
    </div>
  )
}
