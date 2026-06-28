import type { InputFile, ToolResult } from '../../types'

export interface ExtractTextOptions {
  pageBreaks: boolean
}

export interface ExtractTextDeps {
  extractPages(bytes: ArrayBuffer): Promise<string[]>
}

export async function extractText(
  files: InputFile[],
  opts: ExtractTextOptions,
  deps: ExtractTextDeps,
): Promise<ToolResult> {
  const outputs = []
  const notes: string[] = []
  for (const file of files) {
    const base = file.name.replace(/\.[^.]+$/, '')
    try {
      const pages = await deps.extractPages(file.bytes)
      const text = pages
        .map((p, i) =>
          opts.pageBreaks && i > 0 ? `----- Page ${i + 1} -----\n\n${p}` : p,
        )
        .join('\n\n')
      if (text.trim() === '') {
        notes.push(`No selectable text found in ${file.name} — this looks like a scanned PDF.`)
        continue
      }
      outputs.push({ name: `${base}.txt`, blob: new Blob([text], { type: 'text/plain' }) })
    } catch (err) {
      notes.push(`Skipped ${file.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return { outputs, notes: notes.length ? notes : undefined }
}
