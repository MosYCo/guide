/**
 * CommandPalette 组件 - 全屏命令面板
 * Ctrl+K 弹出全屏命令面板,含结果列表 + 键盘上下选择 + Enter 跳转 + Esc 关闭
 * Spotlight/Raycast 风格,复用 shadcn Dialog;结果列表接 useVirtualList
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { StateEmpty } from '@/components/ui/state-feedback'
import { useRootFontSize } from '@/hooks/useRootFontSize'
import { useVirtualList } from '@/hooks/useVirtualList'
import { searchBookmarks } from '@/utils/search'
import { displayDomain } from '@/utils/url'
import { fallbackIcon, resolveIcon } from '@/services/favicon'
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

const ITEM_HEIGHT_REM = 3.5 // h-14
const CONTAINER_HEIGHT_REM = 25 // 400px @ 16px root

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

  // 统一搜索实现:NFKC/去重音/多 token/Unicode 域名
  const results = useMemo(
    () =>
      searchBookmarks(bookmarks, query, {
        limit: query.trim() ? 200 : 50,
      }),
    [bookmarks, query],
  )

  // 虚拟滚动(结果数大于一屏时启用,否则全量);尺寸随根字号缩放
  const rootFontSize = useRootFontSize()
  const itemHeight = ITEM_HEIGHT_REM * rootFontSize
  const containerHeight = CONTAINER_HEIGHT_REM * rootFontSize
  const useVirtual = results.length * itemHeight > containerHeight
  const virtual = useVirtualList(results, itemHeight, containerHeight, {
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
    setActiveIndex((current) => (current >= first && current <= last ? current : first))
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
      const activeRendered = !useVirtual || (activeIndex >= first && activeIndex <= last)
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
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="command-results"
            aria-autocomplete="list"
            aria-activedescendant={results.length > 0 ? `command-option-${activeIndex}` : undefined}
            placeholder="搜索书签（上下选择,回车打开）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="focus-ring h-12 border-0 bg-transparent px-0 text-body shadow-none focus-visible:ring-0"
            aria-label="搜索书签"
          />
        </div>
        <p className="sr-only" aria-live="polite">
          共 {results.length} 个结果
        </p>
        <div
          ref={useVirtual ? virtual.containerRef : undefined}
          id="command-results"
          role={results.length > 0 ? 'listbox' : undefined}
          aria-label={results.length > 0 ? '搜索结果' : undefined}
          data-testid="command-results"
          className="max-h-[25rem] overflow-y-auto"
          style={useVirtual ? { height: containerHeight } : undefined}
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
                    id={`command-option-${actualIndex}`}
                    bookmark={b}
                    active={actualIndex === activeIndex}
                    onSelect={() => {
                      onSelect(b)
                      onClose()
                    }}
                    style={{ position: 'absolute', top: actualIndex * itemHeight }}
                  />
                )
              })}
            </div>
          ) : (
            results.map((b, i) => (
              <CommandPaletteItem
                key={b.id}
                id={`command-option-${i}`}
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
  id,
  bookmark,
  active,
  onSelect,
  style,
}: {
  id: string
  bookmark: Bookmark
  active: boolean
  onSelect: () => void
  style?: React.CSSProperties
}) {
  const domain = displayDomain(bookmark.url)
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      tabIndex={-1}
      style={style}
      aria-label={`打开书签：${bookmark.name}（${domain}）`}
      data-active={active}
      className={cn(
        'flex h-14 w-full cursor-pointer items-center gap-3 px-4 text-left',
        active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
      )}
    >
      <img
        src={bookmark.icon || resolveIcon(bookmark.url, bookmark.name)}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={(e) => {
          e.currentTarget.src = fallbackIcon(bookmark.name)
        }}
        className="h-8 w-8 shrink-0 rounded"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-body truncate font-medium">{bookmark.name}</span>
        <span className="text-caption truncate text-muted-foreground">{domain}</span>
      </div>
    </div>
  )
}
