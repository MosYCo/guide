import { afterEach, describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CategoryNav } from '@/components/category/CategoryNav'
import type { Category } from '@/types'

const categories: Category[] = [
  {
    id: 'cat-work',
    name: 'Work',
    order: 0,
    createdAt: '2026-01-01T00:00:00Z',
  },
]

const originalMatchMedia = window.matchMedia

afterEach(() => {
  window.matchMedia = originalMatchMedia
})

describe('CategoryNav', () => {
  it('PC 侧栏渲染分类并支持选择', () => {
    // 强制 PC 分支
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
    fireEvent.click(screen.getByRole('button', { name: /^Work/ }))
    expect(onSelect).toHaveBeenCalledWith('cat-work')
  })
})
