import { useState } from 'react'
import { runTransform } from '../../lib/runWorker'
import type { PanelProps } from '../../components/ToolPage'
import type { PageNumbersOptions } from './transform'

export function PageNumbersPanel({ files, busy, onRun }: PanelProps) {
  const [position, setPosition] = useState<PageNumbersOptions['position']>('bottom-center')
  const [format, setFormat] = useState<PageNumbersOptions['format']>('plain')
  const [startAt, setStartAt] = useState(1)
  const [fontSize, setFontSize] = useState(12)
  const [margin, setMargin] = useState(24)
  const makeWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  return (
    <div className="space-y-3">
      <label className="field-label">
        Position
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value as PageNumbersOptions['position'])}
          className="field-input"
        >
          <option value="bottom-center">Bottom center</option>
          <option value="bottom-left">Bottom left</option>
          <option value="bottom-right">Bottom right</option>
          <option value="top-center">Top center</option>
          <option value="top-left">Top left</option>
          <option value="top-right">Top right</option>
        </select>
      </label>
      <label className="field-label">
        Format
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as PageNumbersOptions['format'])}
          className="field-input"
        >
          <option value="plain">1</option>
          <option value="slash">1 / N</option>
          <option value="word">Page 1</option>
        </select>
      </label>
      <label className="field-label">
        Start at
        <input
          type="number" min={0} value={startAt}
          onChange={(e) => setStartAt(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          className="field-input"
        />
      </label>
      <label className="field-label">
        Font size: {fontSize}
        <input
          type="range" min={8} max={36} step={1}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="range-input"
        />
      </label>
      <label className="field-label">
        Margin: {margin}
        <input
          type="range" min={8} max={72} step={2}
          value={margin}
          onChange={(e) => setMargin(Number(e.target.value))}
          className="range-input"
        />
      </label>
      <button
        disabled={busy || files.length === 0}
        onClick={() =>
          onRun(() =>
            runTransform<PageNumbersOptions>(makeWorker, {
              files,
              options: { position, format, startAt, fontSize, margin },
            }),
          )
        }
        className="btn-primary"
      >
        {busy ? 'Working…' : 'Add page numbers'}
      </button>
    </div>
  )
}
