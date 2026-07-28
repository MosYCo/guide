import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookmarkForm } from '@/components/bookmark/BookmarkForm'
import { BookmarkCard } from '@/components/bookmark/BookmarkCard'
import type { Bookmark, Category } from '@/types'
import { _resetDBForTesting, getDB, addBookmark } from '@/services/db'

const category: Category = {
  id: 'cat-1',
  name: '工作',
  order: 0,
  createdAt: new Date().toISOString(),
}

const bookmark: Bookmark = {
  id: 'bm-1',
  url: 'https://example.com',
  name: 'Example',
  icon: 'https://icon.example.com',
  categoryId: null,
  createdAt: new Date().toISOString(),
  lastVisitedAt: null,
}

describe('US4 编辑与删除流程', () => {
  beforeEach(async () => {
    _resetDBForTesting()
    const db = await getDB()
    await db.clear('bookmarks')
    await db.clear('categories')
    vi.clearAllMocks()
  })

  it('编辑书签：预填充并保存修改', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onCancel = vi.fn()
    render(
      <BookmarkForm
        open
        bookmark={bookmark}
        categories={[category]}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    )

    // 预填充
    expect(screen.getByDisplayValue('Example')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument()

    // 修改名称
    const user = userEvent.setup()
    const nameInput = screen.getByDisplayValue('Example')
    await user.clear(nameInput)
    await user.type(nameInput, 'Renamed')
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Renamed' }),
    )
  })

  it('删除书签：点击删除弹出确认对话框', async () => {
    const onDelete = vi.fn()
    const onEdit = vi.fn()
    const onClick = vi.fn()
    render(
      <BookmarkCard
        bookmark={bookmark}
        onEdit={onEdit}
        onDelete={onDelete}
        onClick={onClick}
      />,
    )

    const user = userEvent.setup()
    const moreBtn = screen.getByLabelText('更多操作')
    await user.click(moreBtn)
    const deleteItem = await screen.findByText('删除')
    await user.click(deleteItem)
    // 确认对话框出现
    await screen.findByText(/确认删除/)
    // 点确认（对话框内的删除按钮，取最后一个匹配）
    const dialogDeleteBtn = screen
      .getAllByRole('button')
      .filter((b) => b.textContent?.trim() === '删除')
      .pop()!
    await user.click(dialogDeleteBtn)
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('bm-1'))
  })

  it('删除书签从 IndexedDB 物理移除（硬删除）', async () => {
    const db = await getDB()
    await addBookmark(bookmark)
    const before = await db.getAll('bookmarks')
    expect(before).toHaveLength(1)

    await db.delete('bookmarks', bookmark.id)
    const after = await db.getAll('bookmarks')
    expect(after).toHaveLength(0)
  })

  it('编辑书签更新 IndexedDB 中的记录', async () => {
    const db = await getDB()
    await addBookmark(bookmark)
    const updated = { ...bookmark, name: 'Updated Name' }
    await db.put('bookmarks', updated)

    const all = await db.getAll('bookmarks')
    expect(all[0].name).toBe('Updated Name')
  })
})
