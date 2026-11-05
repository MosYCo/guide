import { afterEach, describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { CategoryNav } from '@/components/category/CategoryNav'
import type { Category } from '@/types'

const categories: Category[] = [
  {
    id: 'cat-work',
    name: 'Work',
    icon: 'https://example.com/work.png',
    order: 0,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-life',
    name: '生活',
    order: 1,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-study',
    name: '学习',
    icon: 'lucide:book-open@blue',
    order: 2,
    createdAt: '2026-01-01T00:00:00Z',
  },
]

const originalMatchMedia = window.matchMedia

function mockDesktop() {
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

afterEach(() => {
  window.matchMedia = originalMatchMedia
})

describe('CategoryNav', () => {
  it('PC 侧栏渲染分类并支持选择', () => {
    mockDesktop()

    const onSelect = vi.fn()
    render(
      <CategoryNav
        categories={categories}
        selectedCategoryId={null}
        bookmarkCounts={{ 'cat-work': 2 }}
        totalCount={2}
        onSelect={onSelect}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByRole('navigation', { name: '分类导航' })).toBeInTheDocument()
    expect(screen.getByTestId('category-icon')).toHaveAttribute(
      'src',
      'https://example.com/work.png',
    )
    const studyButton = screen.getByRole('button', { name: /^学习/ })
    expect(within(studyButton).getByTestId('category-icon-preset')).toHaveClass('text-blue-600')
    fireEvent.click(screen.getByRole('button', { name: /^Work/ }))
    expect(onSelect).toHaveBeenCalledWith('cat-work')
  })

  it('折叠侧栏优先显示自定义图标，无图标时回退首字符', () => {
    mockDesktop()
    render(
      <CategoryNav
        categories={categories}
        selectedCategoryId={null}
        bookmarkCounts={{}}
        totalCount={0}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        collapsed
        onToggleCollapse={vi.fn()}
      />,
    )

    const nav = screen.getByRole('navigation', { name: '分类导航（折叠）' })
    const workButton = within(nav).getByRole('button', { name: 'Work' })
    const workIcon = within(workButton).getByTestId('category-icon')
    expect(workIcon).toHaveAttribute('src', 'https://example.com/work.png')

    // 图片加载失败时同样回退首字符
    fireEvent.error(workIcon)
    expect(within(workButton).queryByTestId('category-icon')).not.toBeInTheDocument()
    expect(within(workButton).getByTestId('category-icon-fallback')).toHaveTextContent('W')

    const lifeButton = within(nav).getByRole('button', { name: '生活' })
    expect(within(lifeButton).queryByTestId('category-icon')).not.toBeInTheDocument()
    expect(within(lifeButton).getByTestId('category-icon-fallback')).toHaveTextContent('生')

    const studyButton = within(nav).getByRole('button', { name: '学习' })
    expect(within(studyButton).getByTestId('category-icon-preset')).toHaveClass('text-blue-600')
  })
})
