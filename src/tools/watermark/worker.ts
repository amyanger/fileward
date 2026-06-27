import type { TransformMessage, TransformReply } from '../../types'
import { addWatermark, type WatermarkOptions } from './transform'

self.onmessage = async (e: MessageEvent<TransformMessage<WatermarkOptions>>) => {
  try {
    const result = await addWatermark(e.data.files, e.data.options)
    ;(self as unknown as Worker).postMessage({ ok: true, result } as TransformReply)
  } catch (err) {
    ;(self as unknown as Worker).postMessage({
      ok: false,
      error: (err as Error).message,
    } as TransformReply)
  }
}
