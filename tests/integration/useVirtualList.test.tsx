import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useVirtualList } from '@/hooks/useVirtualList'

function Harness({ items }: { items: number[] }) {
  const virtual = useVirtualList(items, 100, 300)
  return (
    <div
      ref={virtual.containerRef}
      data-testid="virtual-container"
      style={{ height: 300, overflowY: 'auto' }}
    >
      <div style={{ height: virtual.totalHeight, position: 'relative' }}>
        {virtual.visibleItems.map((item) => (
          <div key={item} data-testid={`virtual-item-${item}`}>
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

describe('useVirtualList', () => {
  it('只渲染可视区并随滚动更新', async () => {
    const items = Array.from({ length: 100 }, (_, i) => i)
    render(<Harness items={items} />)

    expect(screen.getByTestId('virtual-item-0')).toBeInTheDocument()
    expect(screen.queryByTestId('virtual-item-60')).not.toBeInTheDocument()

    const container = screen.getByTestId('virtual-container')
    container.scrollTop = 6000
    fireEvent.scroll(container)
    await waitFor(() => {
      expect(screen.queryByTestId('virtual-item-0')).not.toBeInTheDocument()
    })
    expect(screen.getByTestId('virtual-item-60')).toBeInTheDocument()
  })

  it('数据缩短后回到顶部并夹紧范围', () => {
    const { rerender } = render(<Harness items={Array.from({ length: 100 }, (_, i) => i)} />)
    rerender(<Harness items={[1, 2, 3]} />)
    expect(screen.getByTestId('virtual-item-1')).toBeInTheDocument()
    expect(screen.queryByTestId('virtual-item-60')).not.toBeInTheDocument()
  })
})
