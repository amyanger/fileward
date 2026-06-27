import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileList } from './FileList'
import type { InputFile } from '../types'

const items: InputFile[] = [
  { id: '1', name: 'a.pdf', bytes: new ArrayBuffer(2), type: 'application/pdf' },
  { id: '2', name: 'b.pdf', bytes: new ArrayBuffer(4), type: 'application/pdf' },
]

describe('FileList', () => {
  it('renders names and calls onRemove', async () => {
    const onRemove = vi.fn()
    render(<FileList items={items} onRemove={onRemove} onReorder={vi.fn()} />)
    expect(screen.getByText('a.pdf')).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Remove a.pdf'))
    expect(onRemove).toHaveBeenCalledWith('1')
  })

  it('calls onReorder when moving an item up', async () => {
    const onReorder = vi.fn()
    render(<FileList items={items} onRemove={vi.fn()} onReorder={onReorder} />)
    await userEvent.click(screen.getByLabelText('Move b.pdf up'))
    expect(onReorder).toHaveBeenCalledWith(1, 0)
  })
})
