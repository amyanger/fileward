import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dropzone } from './Dropzone'

describe('Dropzone', () => {
  it('calls onFiles when a file is selected', async () => {
    const onFiles = vi.fn()
    render(<Dropzone accept="application/pdf" onFiles={onFiles} />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' })
    await userEvent.upload(input, file)
    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(onFiles.mock.calls[0][0][0].name).toBe('a.pdf')
  })
})
