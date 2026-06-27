import type { TransformMessage, TransformReply } from '../../types'
import { mergeOrSplit, type MergeSplitOptions } from './transform'

self.onmessage = async (e: MessageEvent<TransformMessage<MergeSplitOptions>>) => {
  try {
    const result = await mergeOrSplit(e.data.files, e.data.options)
    ;(self as unknown as Worker).postMessage({ ok: true, result } as TransformReply)
  } catch (err) {
    ;(self as unknown as Worker).postMessage({
      ok: false,
      error: (err as Error).message,
    } as TransformReply)
  }
}
