import { describe, it, expect } from 'vitest'
import { extractText, type ExtractTextDeps } from './transform'
import type { InputFile } from '../../types'

const input: InputFile = { id: '1', name: 'doc.pdf', bytes: new ArrayBuffer(8), type: 'application/pdf' }

function depsReturning(pages: string[]): ExtractTextDeps {
  return { extractPages: async () => pages }
}

describe('extractText', () => {
  it('joins pages with blank lines when pageBreaks is false', async () => {
    const res = await extractText([input], { pageBreaks: false }, depsReturning(['one', 'two']))
    expect(res.outputs).toHaveLength(1)
    expect(res.outputs[0].name).toBe('doc.txt')
    expect(await res.outputs[0].blob.text()).toBe('one\n\ntwo')
  })

  it('inserts page separators when pageBreaks is true', async () => {
    const res = await extractText([input], { pageBreaks: true }, depsReturning(['one', 'two']))
    expect(await res.outputs[0].blob.text()).toBe('one\n\n----- Page 2 -----\n\ntwo')
  })

  it('emits a scanned-pdf note and no output when there is no text', async () => {
    const res = await extractText([input], { pageBreaks: false }, depsReturning(['', '   ']))
    expect(res.outputs).toHaveLength(0)
    expect(res.notes?.[0]).toContain('scanned PDF')
  })
})
