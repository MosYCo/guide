import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BookmarkGrid } from '@/components/bookmark/BookmarkGrid'
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

describe('BookmarkGrid', () => {
  it('渲染书签列表与卡片', () => {
    render(
      <BookmarkGrid
        bookmarks={[
          makeBookmark({ name: 'One', url: 'https://one.example' }),
          makeBookmark({ name: 'Two', url: 'https://two.example' }),
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onClick={vi.fn()}
      />,
    )

    expect(screen.getByRole('list', { name: '全部书签' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开书签：One' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开书签：Two' })).toBeInTheDocument()
  })

  it('空数据展示引导添加', () => {
    render(
      <BookmarkGrid
        bookmarks={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onClick={vi.fn()}
        onAdd={vi.fn()}
      />,
    )
    expect(screen.getByText('暂无书签')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '添加书签' })).toBeInTheDocument()
  })

  it('加载态展示 skeleton 状态', () => {
    render(
      <BookmarkGrid bookmarks={[]} onEdit={vi.fn()} onDelete={vi.fn()} onClick={vi.fn()} loading />,
    )
    expect(screen.getByRole('status', { name: '加载中' })).toBeInTheDocument()
  })
})
