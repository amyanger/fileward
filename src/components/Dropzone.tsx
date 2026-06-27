import { useRef, useState } from 'react'
import type { InputFile } from '../types'

export async function toInputFile(file: File): Promise<InputFile> {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.round(performance.now())}`,
    name: file.name,
    bytes: await file.arrayBuffer(),
    type: file.type,
  }
}

export function Dropzone({
  accept,
  onFiles,
}: {
  accept: string
  onFiles: (files: File[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        onFiles(Array.from(e.dataTransfer.files))
      }}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition ${
        over ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-accent/50'
      }`}
    >
      <p className="font-medium">Drop files here, or click to choose</p>
      <p className="mt-1 text-sm text-muted">Files stay on your device — nothing is uploaded.</p>
      <input
        ref={inputRef}
        data-testid="file-input"
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFiles(Array.from(e.target.files))
          e.target.value = ''
        }}
      />
    </div>
  )
}
