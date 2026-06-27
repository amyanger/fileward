import { describe, it, expect } from 'vitest'
import { runTransform } from './runWorker'
import type { TransformReply } from '../types'

class FakeWorker {
  onmessage: ((e: MessageEvent<TransformReply>) => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  postMessage() {
    queueMicrotask(() =>
      this.onmessage?.({
        data: { ok: true, result: { outputs: [], notes: ['hi'] } },
      } as unknown as MessageEvent<TransformReply>),
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

  it('ignores stray non-reply messages (e.g. pdf.js worker protocol) before the result', async () => {
    class PdfjsWorker extends FakeWorker {
      postMessage() {
        queueMicrotask(() => {
          // pdf.js posts this on the global scope before our real reply
          this.onmessage?.({
            data: { sourceName: 'worker', targetName: 'main', action: 'ready', data: null },
          } as unknown as MessageEvent<TransformReply>)
          this.onmessage?.({
            data: { ok: true, result: { outputs: [], notes: ['done'] } },
          } as unknown as MessageEvent<TransformReply>)
        })
      }
    }
    const res = await runTransform(() => new PdfjsWorker() as unknown as Worker, {
      files: [],
      options: {},
    })
    expect(res.notes).toEqual(['done'])
  })

  it('rejects on error reply', async () => {
    class ErrWorker extends FakeWorker {
      postMessage() {
        queueMicrotask(() =>
          this.onmessage?.({
            data: { ok: false, error: 'boom' },
          } as unknown as MessageEvent<TransformReply>),
        )
      }
    }
    await expect(
      runTransform(() => new ErrWorker() as unknown as Worker, { files: [], options: {} }),
    ).rejects.toThrow('boom')
  })
})
