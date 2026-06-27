export interface InputFile {
  id: string
  name: string
  bytes: ArrayBuffer
  type: string
}

export interface OutputFile {
  name: string
  blob: Blob
}

export interface ToolResult {
  outputs: OutputFile[]
  notes?: string[]
}

export interface ToolDef {
  id: string
  title: string
  description: string
  /** input accept attribute, e.g. "application/pdf" or "image/*" */
  accept: string
}

export type TransformMessage<O> = { files: InputFile[]; options: O }
export type TransformReply =
  | { ok: true; result: ToolResult }
  | { ok: false; error: string }
