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

  it('仅在首页显示置顶并从最近访问去重，全部书签仍保留', () => {
    const pinned = makeBookmark({ id: 'pinned', name: 'Pinned', pinnedAt: '2026-01-02T00:00:00Z' })
    const recent = makeBookmark({ id: 'recent', name: 'Recent' })
    const props = { onEdit: vi.fn(), onDelete: vi.fn(), onClick: vi.fn() }
    const { rerender } = render(
      <BookmarkGrid
        bookmarks={[pinned, recent]}
        pinnedBookmarks={[pinned]}
        recentBookmarks={[pinned, recent]}
        {...props}
      />,
    )
    expect(screen.getByRole('list', { name: '置顶书签' })).toHaveTextContent('Pinned')
    expect(screen.getByRole('list', { name: '最近访问' })).not.toHaveTextContent('Pinned')
    expect(screen.getByRole('list', { name: '全部书签' })).toHaveTextContent('Pinned')

    rerender(<BookmarkGrid bookmarks={[pinned]} {...props} />)
    expect(screen.queryByRole('list', { name: '置顶书签' })).not.toBeInTheDocument()
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
