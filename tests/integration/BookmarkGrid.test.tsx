import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('主列表菜单支持前移/后移并回传相邻目标', async () => {
    const user = userEvent.setup()
    const onReorder = vi.fn()
    render(
      <BookmarkGrid
        bookmarks={[
          makeBookmark({ id: 'one', name: 'One' }),
          makeBookmark({ id: 'two', name: 'Two' }),
          makeBookmark({ id: 'three', name: 'Three' }),
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onClick={vi.fn()}
        onReorderBookmark={onReorder}
      />,
    )

    await user.click(screen.getByRole('button', { name: '更多操作：Two' }))
    expect(screen.getByRole('menuitem', { name: '前移' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '后移' })).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: '前移' }))
    expect(onReorder).toHaveBeenLastCalledWith('two', 'one', 'before')

    await user.click(screen.getByRole('button', { name: '更多操作：Two' }))
    await user.click(screen.getByRole('menuitem', { name: '后移' }))
    expect(onReorder).toHaveBeenLastCalledWith('two', 'three', 'after')
  })

  it('边界书签只显示可用的移动方向', async () => {
    const user = userEvent.setup()
    render(
      <BookmarkGrid
        bookmarks={[
          makeBookmark({ id: 'one', name: 'One' }),
          makeBookmark({ id: 'two', name: 'Two' }),
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onClick={vi.fn()}
        onReorderBookmark={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: '更多操作：One' }))
    expect(screen.queryByRole('menuitem', { name: '前移' })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '后移' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('button', { name: '更多操作：Two' }))
    expect(screen.getByRole('menuitem', { name: '前移' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: '后移' })).not.toBeInTheDocument()
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
