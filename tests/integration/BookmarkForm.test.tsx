import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookmarkForm } from '@/components/bookmark/BookmarkForm'
import type { Bookmark, Category } from '@/types'

const category: Category = {
  id: 'cat-1',
  name: '工作',
  order: 0,
  createdAt: new Date().toISOString(),
}

function renderForm(props: Partial<Parameters<typeof BookmarkForm>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const onCancel = vi.fn()
  render(
    <BookmarkForm
      open
      categories={[category]}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />,
  )
  return { onSubmit, onCancel }
}

describe('BookmarkForm（添加模式）', () => {
  beforeEach(() => vi.clearAllMocks())

  it('有效 URL 提交成功', async () => {
    const { onSubmit, onCancel } = renderForm()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('https://example.com'), 'https://github.com')
    await user.type(screen.getByPlaceholderText('书签名称'), 'GitHub')
    await user.click(screen.getByRole('button', { name: '添加' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://github.com/',
        name: 'GitHub',
      }),
    )
    expect(onCancel).toHaveBeenCalled()
  })

  it('无效 URL 被拒绝', async () => {
    const { onSubmit } = renderForm()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('https://example.com'), 'javascript:alert(1)')
    await user.type(screen.getByPlaceholderText('书签名称'), 'Bad')
    await user.click(screen.getByRole('button', { name: '添加' }))
    await waitFor(() => expect(screen.getByText(/http\/https/)).toBeInTheDocument())
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('空 URL 被拒绝', async () => {
    const { onSubmit } = renderForm()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('书签名称'), 'No URL')
    await user.click(screen.getByRole('button', { name: '添加' }))
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled())
  })

  it('图标预览在未填写时自动解析', async () => {
    renderForm()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('https://example.com'), 'example.com')
    await user.type(screen.getByPlaceholderText('书签名称'), 'Example')
    const previewImg = screen.getByAltText('图标预览')
    expect(previewImg).toHaveAttribute(
      'src',
      expect.stringContaining('google.com/s2/favicons'),
    )
  })
})

describe('BookmarkForm（编辑模式）', () => {
  const existing: Bookmark = {
    id: 'bm-1',
    url: 'https://old.com',
    name: 'Old Name',
    icon: 'https://icon.old',
    categoryId: null,
    createdAt: '2026-01-01T00:00:00Z',
    lastVisitedAt: null,
  }

  it('预填充已有书签数据', () => {
    renderForm({ bookmark: existing })
    expect(screen.getByDisplayValue('https://old.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Old Name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
  })

  it('修改名称后提交', async () => {
    const { onSubmit } = renderForm({ bookmark: existing })
    const user = userEvent.setup()
    const nameInput = screen.getByDisplayValue('Old Name')
    await user.clear(nameInput)
    await user.type(nameInput, 'New Name')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Name' }),
    )
  })
})
