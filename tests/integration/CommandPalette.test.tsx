import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CommandPalette } from '@/components/bookmark/CommandPalette'
import type { Bookmark } from '@/types'

function makeBookmark(over: Partial<Bookmark> = {}): Bookmark {
  return {
    id: crypto.randomUUID(),
    url: 'https://example.com',
    name: 'Example',
    icon: '',
    categoryId: null,
    createdAt: '2026-01-01T00:00:00Z',
    lastVisitedAt: null,
    ...over,
  }
}

const bookmarks = [
  makeBookmark({ name: 'GitHub', url: 'https://github.com/repo' }),
  makeBookmark({ name: 'Google', url: 'https://google.com' }),
]

describe('CommandPalette', () => {
  it('按名称过滤并通过 Enter 选择', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<CommandPalette open bookmarks={bookmarks} onSelect={onSelect} onClose={onClose} />)

    const input = screen.getByRole('combobox', { name: '搜索书签' })
    fireEvent.change(input, { target: { value: 'git' } })
    const option = await screen.findByRole('option', { name: /GitHub/ })
    expect(option).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'GitHub' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('无结果时展示空态且 combobox 收起', async () => {
    render(<CommandPalette open bookmarks={bookmarks} onSelect={vi.fn()} onClose={vi.fn()} />)
    const input = screen.getByRole('combobox', { name: '搜索书签' })
    fireEvent.change(input, { target: { value: 'zzzznomatch' } })

    expect(await screen.findByText('未找到匹配的书签')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
