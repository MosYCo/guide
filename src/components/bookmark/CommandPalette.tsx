/**
 * CommandPalette 组件 - 全屏命令面板
 * FR-008: Ctrl+K 弹出全屏命令面板,含结果列表 + 键盘上下选择 + Enter 跳转 + Esc 关闭
 * T013: Spotlight/Raycast 风格,复用 shadcn Dialog;结果列表接 useVirtualList
 * @see specs/001-ui-ux-overhaul/contracts/ui-contract.md §4
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { StateEmpty } from '@/components/ui/state-feedback'
import { useVirtualList } from '@/hooks/useVirtualList'
import { extractDomain } from '@/utils/url'
import { fallbackIcon } from '@/services/favicon'
import { cn } from '@/lib/utils'
import type { Bookmark } from '@/types'

export interface CommandPaletteProps {
  open: boolean
  bookmarks: Bookmark[]
  onSelect: (bookmark: Bookmark) => void
  onClose: () => void
  /** 空结果时的引导动作(新建书签) */
  onCreate?: () => void
}

const ITEM_HEIGHT = 56 // 单项高度(图标+标题+域名)
const CONTAINER_HEIGHT = 400 // 结果列表可视高度

export function CommandPalette({
  open,
  bookmarks,
  onSelect,
  onClose,
  onCreate,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // 过滤结果(内联过滤逻辑:按名称与 URL 匹配)
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return bookmarks.slice(0, 50) // 无查询时展示前 50 条
    return bookmarks
      .filter(
        (b) =>
          b.name.toLowerCase().includes(q) || b.url.toLowerCase().includes(q),
      )
      .slice(0, 200) // 限制最大结果数
  }, [bookmarks, query])

  // 虚拟滚动(结果数大于一屏时启用,否则全量)
  const useVirtual = results.length * ITEM_HEIGHT > CONTAINER_HEIGHT
  const virtual = useVirtualList(results, ITEM_HEIGHT, CONTAINER_HEIGHT, {
    resetKey: query,
  })

  // 打开时重置 query + 焦点落输入框
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      // 延迟聚焦,确保 DOM 已挂载
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // 结果变化时重置 active index
  useEffect(() => {
    setActiveIndex(0)
  }, [results])

  // 滚轮/触控滚动后,若高亮项移出渲染窗口,把高亮同步到首个可见项
  useEffect(() => {
    if (!useVirtual) return
    const first = virtual.startIndex
    const last = first + virtual.visibleItems.length - 1
    setActiveIndex((current) =>
      current >= first && current <= last ? current : first,
    )
  }, [useVirtual, virtual.startIndex, virtual.visibleItems.length])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
      // 虚拟滚动跟随
      if (useVirtual) virtual.scrollToIndex(activeIndex + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
      if (useVirtual) virtual.scrollToIndex(Math.max(activeIndex - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const first = virtual.startIndex
      const last = first + virtual.visibleItems.length - 1
      const activeRendered =
        !useVirtual || (activeIndex >= first && activeIndex <= last)
      if (activeRendered && results[activeIndex]) {
        onSelect(results[activeIndex])
        onClose()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="top-[20%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0">
        {/* 隐藏标题/描述供 SR,避免可见重复 */}
        <DialogTitle className="sr-only">命令面板</DialogTitle>
        <DialogDescription className="sr-only">
          输入关键词搜索书签,上下键选择,回车打开
        </DialogDescription>
        <div className="flex items-center border-b border-border px-4">
          <Input
            ref={inputRef}
            type="text"
            placeholder="搜索书签（上下选择,回车打开）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="focus-ring h-12 border-0 bg-transparent px-0 text-body shadow-none focus-visible:ring-0"
            aria-label="搜索书签"
          />
        </div>
        <div
          ref={useVirtual ? virtual.containerRef : undefined}
          data-testid="command-results"
          className="max-h-[400px] overflow-y-auto"
          style={useVirtual ? { height: CONTAINER_HEIGHT } : undefined}
        >
          {results.length === 0 ? (
            <StateEmpty
              message="未找到匹配的书签"
              action={
                onCreate && (
                  <button
                    onClick={() => {
                      onCreate()
                      onClose()
                    }}
                    className="focus-ring rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    新建书签
                  </button>
                )
              }
            />
          ) : useVirtual ? (
            <div style={{ height: virtual.totalHeight, position: 'relative' }}>
              {virtual.visibleItems.map((b, vi) => {
                const actualIndex = virtual.startIndex + vi
                return (
                  <CommandPaletteItem
                    key={b.id}
                    bookmark={b}
                    active={actualIndex === activeIndex}
                    onSelect={() => {
                      onSelect(b)
                      onClose()
                    }}
                    style={{ position: 'absolute', top: actualIndex * ITEM_HEIGHT }}
                  />
                )
              })}
            </div>
          ) : (
            results.map((b, i) => (
              <CommandPaletteItem
                key={b.id}
                bookmark={b}
                active={i === activeIndex}
                onSelect={() => {
                  onSelect(b)
                  onClose()
                }}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CommandPaletteItem({
  bookmark,
  active,
  onSelect,
  style,
}: {
  bookmark: Bookmark
  active: boolean
  onSelect: () => void
  style?: React.CSSProperties
}) {
  const domain = extractDomain(bookmark.url)
  return (
    <button
      type="button"
      onClick={onSelect}
      style={style}
      aria-label={`打开书签：${bookmark.name}`}
      data-active={active}
      className={cn(
        'flex h-14 w-full items-center gap-3 px-4 text-left',
        active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
      )}
    >
      <img
        src={bookmark.icon || fallbackIcon(bookmark.name)}
        alt=""
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.src = fallbackIcon(bookmark.name)
        }}
        className="h-8 w-8 shrink-0 rounded"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-body truncate font-medium">{bookmark.name}</span>
        <span className="text-caption truncate text-muted-foreground">
          {domain}
        </span>
      </div>
    </button>
  )
}
