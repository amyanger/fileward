import type { TransformMessage, TransformReply, ToolResult } from '../types'

export function runTransform<O>(
  workerFactory: () => Worker,
  payload: TransformMessage<O>,
): Promise<ToolResult> {
  return new Promise((resolve, reject) => {
    const worker = workerFactory()
    worker.onmessage = (e: MessageEvent<TransformReply>) => {
      worker.terminate()
      if (e.data.ok) resolve(e.data.result)
      else reject(new Error(e.data.error))
    }
    worker.onerror = (e) => {
      worker.terminate()
      reject(new Error(e instanceof ErrorEvent ? e.message : 'Worker error'))
    }
    worker.postMessage(payload)
  })
}
