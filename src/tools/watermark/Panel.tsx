import { useState } from 'react'
import { runTransform } from '../../lib/runWorker'
import type { PanelProps } from '../../components/ToolPage'
import type { WatermarkOptions } from './transform'

export function WatermarkPanel({ files, busy, onRun }: PanelProps) {
  const [text, setText] = useState('CONFIDENTIAL')
  const [layout, setLayout] = useState<WatermarkOptions['layout']>('center')
  const [angle, setAngle] = useState(45)
  const [fontSize, setFontSize] = useState(48)
  const [opacity, setOpacity] = useState(0.15)
  const makeWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  return (
    <div className="space-y-3">
      <label className="field-label">
        Watermark text
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="field-input"
        />
      </label>
      <label className="field-label">
        Layout
        <select
          value={layout}
          onChange={(e) => setLayout(e.target.value as WatermarkOptions['layout'])}
          className="field-input"
        >
          <option value="center">Single (centered)</option>
          <option value="tile">Tiled</option>
        </select>
      </label>
      <label className="field-label">
        Angle: {angle}°
        <input
          type="range" min={0} max={90} step={5}
          value={angle}
          onChange={(e) => setAngle(Number(e.target.value))}
          className="field-input"
        />
      </label>
      <label className="field-label">
        Font size: {fontSize}
        <input
          type="range" min={12} max={96} step={2}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="field-input"
        />
      </label>
      <label className="field-label">
        Opacity: {opacity.toFixed(2)}
        <input
          type="range" min={0.05} max={0.6} step={0.05}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="field-input"
        />
      </label>
      <button
        disabled={busy || files.length === 0 || text.trim() === ''}
        onClick={() =>
          onRun(() =>
            runTransform<WatermarkOptions>(makeWorker, {
              files,
              options: { text: text.trim(), opacity, angle, fontSize, layout },
            }),
          )
        }
        className="btn-primary"
      >
        {busy ? 'Working…' : 'Add watermark'}
      </button>
    </div>
  )
}
