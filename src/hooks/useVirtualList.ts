/**
 * useVirtualList Hook - 虚拟滚动
 * FR-018: 大数据量书签列表仅渲染可视区,占位总高防 CLS
 * T012: 数据量小于一屏时退化不启用(全量渲染)
 * @see specs/001-ui-ux-overhaul/data-model.md §useVirtualList
 * @see specs/001-ui-ux-overhaul/contracts/ui-contract.md §4
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseVirtualListReturn<T> {
  /** 仅可视区数据 */
  visibleItems: T[]
  /** 占位总高(防 CLS) */
  totalHeight: number
  /** 可视区起始偏移(用于绝对定位) */
  offsetY: number
  /** 滚动容器 ref */
  containerRef: React.RefObject<HTMLDivElement>
  /** 滚动到指定 index */
  scrollToIndex: (index: number) => void
}

export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
): UseVirtualListReturn<T> {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  // 总高:占位防 CLS(即使未渲染也撑开容器)
  const totalHeight = items.length * itemHeight

  // 可视区能容纳的项数 + 上下缓冲
  const overscan = 3 // 上下各多渲染 3 项,防滚动边缘闪烁
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2

  // 可视区起始 index(clamp 防越界)
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length,
    Math.floor(scrollTop / itemHeight) + visibleCount,
  )

  const visibleItems = items.slice(startIndex, endIndex)
  const offsetY = startIndex * itemHeight

  // 滚动监听(被动 rAF 节流,避免主线程阻塞)
  const tickingRef = useRef(false)
  const onScroll = useCallback(() => {
    if (tickingRef.current) return
    tickingRef.current = true
    requestAnimationFrame(() => {
      if (containerRef.current) {
        setScrollTop(containerRef.current.scrollTop)
      }
      tickingRef.current = false
    })
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [onScroll])

  const scrollToIndex = useCallback(
    (index: number) => {
      if (containerRef.current) {
        const target = Math.max(0, Math.min(index, items.length - 1))
        containerRef.current.scrollTop = target * itemHeight
      }
    },
    [items.length, itemHeight],
  )

  return { visibleItems, totalHeight, offsetY, containerRef, scrollToIndex }
}
