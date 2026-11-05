import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryForm } from '@/components/category/CategoryForm'
import type { Category } from '@/types'

const existing: Category = {
  id: 'cat-1',
  name: '工作',
  icon: 'https://example.com/work.png',
  order: 0,
  createdAt: '2026-01-01T00:00:00Z',
}

function renderForm(props: Partial<Parameters<typeof CategoryForm>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const onCancel = vi.fn()
  render(<CategoryForm open onSubmit={onSubmit} onCancel={onCancel} {...props} />)
  return { onSubmit, onCancel }
}

describe('CategoryForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('新建分类时提交名称与图标', async () => {
    const { onSubmit, onCancel } = renderForm()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('分类名称'), '工作')
    await user.type(screen.getByLabelText('图片 URL（可选）'), 'https://example.com/work.png')
    await user.click(screen.getByRole('button', { name: '创建' }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith('工作', 'https://example.com/work.png'),
    )
    expect(onCancel).toHaveBeenCalled()
  })

  it('非法图标协议就地报错且不提交', async () => {
    const { onSubmit } = renderForm()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('分类名称'), '工作')
    await user.type(screen.getByLabelText('图片 URL（可选）'), 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: '创建' }))
    expect(
      await screen.findByText('图标需为预置图标、http(s) 或 data:image 链接'),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('编辑模式预填名称与图标', () => {
    renderForm({ category: existing })
    expect(screen.getByText('编辑分类')).toBeInTheDocument()
    expect(screen.getByDisplayValue('工作')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.com/work.png')).toBeInTheDocument()
  })

  it('未填图标时预览回退名称首字符', async () => {
    renderForm()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('分类名称'), '工作')
    expect(screen.getByTestId('category-icon-fallback')).toHaveTextContent('工')
  })

  it('选择预置图标与颜色后提交 token', async () => {
    const { onSubmit } = renderForm()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('分类名称'), '工作')
    await user.click(screen.getByRole('button', { name: '使用图标：工作' }))
    await user.click(screen.getByRole('button', { name: '颜色：蓝色' }))
    await user.click(screen.getByRole('button', { name: '创建' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('工作', 'lucide:briefcase@blue'))
  })

  it('编辑模式回填预置图标与颜色并原样保存', async () => {
    const { onSubmit } = renderForm({
      category: { ...existing, icon: 'lucide:book-open@green' },
    })
    const user = userEvent.setup()
    expect(screen.getByRole('button', { name: '使用图标：阅读' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: '颜色：绿色' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByLabelText('图片 URL（可选）')).toHaveValue('')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('工作', 'lucide:book-open@green'))
  })

  it('选择预置后输入图片 URL 会取消预置选择', async () => {
    const { onSubmit } = renderForm()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('分类名称'), '工作')
    await user.click(screen.getByRole('button', { name: '使用图标：工作' }))
    expect(screen.getByRole('button', { name: '颜色：蓝色' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('图片 URL（可选）'), 'https://example.com/work.png')
    expect(screen.queryByRole('button', { name: '颜色：蓝色' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '创建' }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith('工作', 'https://example.com/work.png'),
    )
  })

  it('清除预置图标后按未设置提交', async () => {
    const { onSubmit } = renderForm({
      category: { ...existing, icon: 'lucide:briefcase@blue' },
    })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '清除' }))
    expect(screen.getByLabelText('图片 URL（可选）')).toHaveValue('')
    expect(screen.queryByRole('button', { name: '颜色：蓝色' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('工作', ''))
  })
})
