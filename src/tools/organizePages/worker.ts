import type { TransformMessage, TransformReply } from '../../types'
import { organizePages, type OrganizePagesOptions } from './transform'

self.onmessage = async (e: MessageEvent<TransformMessage<OrganizePagesOptions>>) => {
  try {
    const result = await organizePages(e.data.files, e.data.options)
    ;(self as unknown as Worker).postMessage({ ok: true, result } as TransformReply)
  } catch (err) {
    ;(self as unknown as Worker).postMessage({
      ok: false,
      error: (err as Error).message,
    } as TransformReply)
  }
}
