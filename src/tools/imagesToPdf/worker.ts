import type { TransformMessage, TransformReply } from '../../types'
import { imagesToPdf, type ImagesToPdfOptions } from './transform'

self.onmessage = async (e: MessageEvent<TransformMessage<ImagesToPdfOptions>>) => {
  try {
    const result = await imagesToPdf(e.data.files, e.data.options)
    ;(self as unknown as Worker).postMessage({ ok: true, result } as TransformReply)
  } catch (err) {
    ;(self as unknown as Worker).postMessage({
      ok: false,
      error: (err as Error).message,
    } as TransformReply)
  }
}
