import type { TransformMessage, TransformReply } from '../../types'
import { convertImages, type ImageConvertOptions } from './transform'

self.onmessage = async (e: MessageEvent<TransformMessage<ImageConvertOptions>>) => {
  try {
    const result = await convertImages(e.data.files, e.data.options)
    ;(self as unknown as Worker).postMessage({ ok: true, result } as TransformReply)
  } catch (err) {
    ;(self as unknown as Worker).postMessage({
      ok: false,
      error: (err as Error).message,
    } as TransformReply)
  }
}
