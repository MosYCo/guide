/**
 * useVirtualList Hook - 虚拟滚动
 * FR-018: 大数据量书签列表仅渲染可视区,占位总高防 CLS
 * T012: 数据量小于一屏时退化不启用(全量渲染)
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseVirtualListOptions {
  /** 上下各多渲染的项数 */
  overscan?: number
  /** 数据或布局变化时重置滚动位置(如查询词、列数) */
  resetKey?: unknown
}

export interface UseVirtualListReturn<T> {
  /** 仅可视区数据 */
  visibleItems: T[]
  /** 占位总高(防 CLS) */
  totalHeight: number
  /** 可视区起始偏移(用于绝对定位) */
  offsetY: number
  /** 可视区起始 index */
  startIndex: number
  /** 滚动容器回调 ref(容器延迟挂载时也能正确绑定监听) */
  containerRef: (node: HTMLDivElement | null) => void
  /** 滚动到指定 index */
  scrollToIndex: (index: number) => void
}

export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  options: UseVirtualListOptions = {},
): UseVirtualListReturn<T> {
  const { overscan = 3, resetKey } = options
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)

  // 总高:占位防 CLS(即使未渲染也撑开容器)
  const totalHeight = items.length * itemHeight

  // 可视区能容纳的项数 + 上下缓冲
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2

  // scrollTop 夹到合法范围,避免数据缩短后停在越界位置
  const maxScrollTop = Math.max(0, totalHeight - containerHeight)
  const clampedScrollTop = Math.min(scrollTop, maxScrollTop)
  const startIndex = Math.min(
    Math.max(0, Math.floor(clampedScrollTop / itemHeight) - overscan),
    Math.max(0, items.length - 1),
  )
  const endIndex = Math.min(items.length, Math.floor(clampedScrollTop / itemHeight) + visibleCount)

  const visibleItems = items.slice(startIndex, endIndex)
  const offsetY = startIndex * itemHeight

  // 回调 ref:命令面板等容器在 portal 挂载后才出现,effect 需要随之重跑
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerEl(node)
  }, [])

  // 滚动监听(被动 rAF 节流,避免主线程阻塞)
  const tickingRef = useRef(false)
  const onScroll = useCallback(() => {
    if (tickingRef.current) return
    tickingRef.current = true
    requestAnimationFrame(() => {
      if (containerEl) {
        setScrollTop(containerEl.scrollTop)
      }
      tickingRef.current = false
    })
  }, [containerEl])

  useEffect(() => {
    if (!containerEl) return
    setScrollTop(containerEl.scrollTop)
    containerEl.addEventListener('scroll', onScroll, { passive: true })
    return () => containerEl.removeEventListener('scroll', onScroll)
  }, [containerEl, onScroll])

  // 数据/布局变化时回到顶部,避免旧 scrollTop 落在新列表之外
  useEffect(() => {
    setScrollTop(0)
    if (containerEl) containerEl.scrollTop = 0
  }, [items.length, resetKey, containerEl])

  const scrollToIndex = useCallback(
    (index: number) => {
      if (!containerEl) return
      const target = Math.max(0, Math.min(index, items.length - 1))
      const top = target * itemHeight
      containerEl.scrollTop = top
      setScrollTop(top)
    },
    [containerEl, items.length, itemHeight],
  )

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    containerRef,
    scrollToIndex,
  }
}
