import type { TransformMessage, TransformReply } from '../../types'
import { addPageNumbers, type PageNumbersOptions } from './transform'

self.onmessage = async (e: MessageEvent<TransformMessage<PageNumbersOptions>>) => {
  try {
    const result = await addPageNumbers(e.data.files, e.data.options)
    ;(self as unknown as Worker).postMessage({ ok: true, result } as TransformReply)
  } catch (err) {
    ;(self as unknown as Worker).postMessage({
      ok: false,
      error: (err as Error).message,
    } as TransformReply)
  }
}
