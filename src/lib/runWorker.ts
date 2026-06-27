import type { TransformMessage, TransformReply, ToolResult } from '../types'

export function runTransform<O>(
  workerFactory: () => Worker,
  payload: TransformMessage<O>,
): Promise<ToolResult> {
  return new Promise((resolve, reject) => {
    const worker = workerFactory()
    worker.onmessage = (e: MessageEvent<TransformReply>) => {
      // pdf.js (loaded inside the pdf-based workers) posts its own protocol
      // messages on the global scope. Ignore anything that isn't our reply,
      // otherwise we'd treat pdf.js's {action:'ready'} message as the result.
      const data = e.data as { ok?: unknown } | undefined
      if (!data || typeof data.ok !== 'boolean') return
      worker.terminate()
      const reply = data as TransformReply
      if (reply.ok) resolve(reply.result)
      else reject(new Error(reply.error))
    }
    worker.onerror = (e) => {
      worker.terminate()
      reject(new Error(e instanceof ErrorEvent ? e.message : 'Worker error'))
    }
    worker.postMessage(payload)
  })
}
