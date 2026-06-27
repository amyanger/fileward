import { downloadZip } from 'client-zip'
import type { OutputFile } from '../types'

function trigger(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function downloadOutputs(outputs: OutputFile[]): Promise<void> {
  if (outputs.length === 0) return
  if (outputs.length === 1) {
    trigger(outputs[0].blob, outputs[0].name)
    return
  }
  const zipBlob = await downloadZip(
    outputs.map((o) => ({ name: o.name, input: o.blob })),
  ).blob()
  trigger(zipBlob, 'fileward-output.zip')
}
