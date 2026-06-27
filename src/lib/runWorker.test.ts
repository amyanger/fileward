import { describe, it, expect, vi } from 'vitest'
import { runTransform } from './runWorker'
import type { TransformReply } from '../types'

class FakeWorker {
  onmessage: ((e: MessageEvent<TransformReply>) => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  postMessage() {
    queueMicrotask(() =>
      this.onmessage?.({
        data: { ok: true, result: { outputs: [], notes: ['hi'] } },
      } as MessageEvent<TransformReply>),
    )
  }
  terminate() {}
}

describe('runTransform', () => {
  it('resolves with the worker result and terminates', async () => {
    const res = await runTransform(() => new FakeWorker() as unknown as Worker, {
      files: [],
      options: {},
    })
    expect(res.notes).toEqual(['hi'])
  })

  it('rejects on error reply', async () => {
    class ErrWorker extends FakeWorker {
      postMessage() {
        queueMicrotask(() =>
          this.onmessage?.({
            data: { ok: false, error: 'boom' },
          } as MessageEvent<TransformReply>),
        )
      }
    }
    await expect(
      runTransform(() => new ErrWorker() as unknown as Worker, { files: [], options: {} }),
    ).rejects.toThrow('boom')
  })
})
