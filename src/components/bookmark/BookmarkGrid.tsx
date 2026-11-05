/**
 * BookmarkGrid 组件 - 书签网格展示
 * 按分类分组、空状态、最近访问区域
 * 加载/空/错误状态收敛为 StateLoading/StateEmpty 组件
 * 大数据量启用虚拟滚动,占位总高防 CLS
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BookmarkCard } from '@/components/bookmark/BookmarkCard'
import { StateEmpty, StateLoading } from '@/components/ui/state-feedback'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useRootFontSize } from '@/hooks/useRootFontSize'
import { useVirtualList } from '@/hooks/useVirtualList'
import type { Bookmark, Category } from '@/types'

// 虚拟滚动阈值——超过此数启用,否则全量渲染(小于一屏退化)
const VIRTUAL_THRESHOLD = 60
// 以下尺寸用 rem,与条目高度和 gap-3 同源,根字号变化时同步缩放
const CARD_HEIGHT_REM = 4.75 // 76px @ 16px root
const GRID_GAP_REM = 0.75 // gap-3
const VIRTUAL_VIEWPORT_REM = 37.5 // 600px @ 16px root
// 列数与 BookmarkCardList 的 JS columns 一致;超宽屏由容器最大宽度限制条目宽度。
const GRID_COLUMNS_CLASS =
  'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'

export interface BookmarkGridProps {
  bookmarks: Bookmark[]
  onEdit: (bookmark: Bookmark) => void
  onDelete: (bookmarkId: string) => void
  onClick: (bookmark: Bookmark) => void
  emptyMessage?: string
  /** 仅首页展示的置顶快捷入口 */
  pinnedBookmarks?: Bookmark[]
  /** 可选：在网格上方渲染最近访问区域 */
  recentBookmarks?: Bookmark[]
  onTogglePin?: (bookmark: Bookmark) => void
  /** 书签拖拽开始（用于拖到分类） */
  onBookmarkDragStart?: (bookmark: Bookmark) => void
  /** 书签拖拽结束/取消 */
  onBookmarkDragEnd?: () => void
  /** 分类列表(用于键盘/触屏“移动到分类”) */
  categories?: Category[]
  onMoveToCategory?: (bookmark: Bookmark, categoryId: string | null) => void
  /** 是否显示加载骨架 */
  loading?: boolean
  /**: 空状态引导动作(添加书签) */
  onAdd?: () => void
  /** 数据作用域变化(如切换分类)时重置虚拟列表滚动位置 */
  resetKey?: string | number
}

export function BookmarkGrid({
  bookmarks,
  onEdit,
  onDelete,
  onClick,
  emptyMessage = '暂无书签',
  pinnedBookmarks,
  recentBookmarks,
  onTogglePin,
  onBookmarkDragStart,
  onBookmarkDragEnd,
  categories,
  onMoveToCategory,
  loading,
  onAdd,
  resetKey,
}: BookmarkGridProps) {
  const hasPinned = pinnedBookmarks && pinnedBookmarks.length > 0
  const recentWithoutPinned = recentBookmarks?.filter((bookmark) => !bookmark.pinnedAt)
  const hasRecent = recentWithoutPinned && recentWithoutPinned.length > 0
  const hasBookmarks = bookmarks.length > 0

  // 加载态统一为 StateLoading
  if (loading) return <StateLoading rows={12} />

  // 空状态:文案 + 引导动作(添加书签)
  if (!hasBookmarks && !hasRecent) {
    return (
      <StateEmpty
        message={emptyMessage}
        action={
          onAdd && (
            <button
              onClick={onAdd}
              className="focus-ring rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              添加书签
            </button>
          )
        }
      />
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-8">
      {hasPinned && (
        <section>
          <h2 className="text-h1 mb-2 text-muted-foreground">置顶书签</h2>
          <div role="list" aria-label="置顶书签" className={GRID_COLUMNS_CLASS}>
            {pinnedBookmarks.map((b, index) => (
              <div
                key={b.id}
                role="listitem"
                aria-setsize={pinnedBookmarks.length}
                aria-posinset={index + 1}
              >
                <BookmarkCard
                  bookmark={b}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onClick={onClick}
                  onTogglePin={onTogglePin}
                  onDragStart={onBookmarkDragStart}
                  onDragEnd={onBookmarkDragEnd}
                  categories={categories}
                  onMoveToCategory={onMoveToCategory}
                />
              </div>
            ))}
          </div>
        </section>
      )}
      {hasRecent && (
        <section>
          <h2 className="text-h1 mb-2 text-muted-foreground">最近访问</h2>
          <div role="list" aria-label="最近访问" className={GRID_COLUMNS_CLASS}>
            {recentWithoutPinned.map((b, index) => (
              <div
                key={b.id}
                role="listitem"
                aria-setsize={recentWithoutPinned.length}
                aria-posinset={index + 1}
              >
                <BookmarkCard
                  bookmark={b}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onClick={onClick}
                  onTogglePin={onTogglePin}
                  onDragStart={onBookmarkDragStart}
                  onDragEnd={onBookmarkDragEnd}
                  categories={categories}
                  onMoveToCategory={onMoveToCategory}
                />
              </div>
            ))}
          </div>
        </section>
      )}
      {hasBookmarks && (
        <section>
          <h2 className="text-h1 mb-2 text-muted-foreground">全部书签</h2>
          <BookmarkCardList
            bookmarks={bookmarks}
            onEdit={onEdit}
            onDelete={onDelete}
            onClick={onClick}
            onTogglePin={onTogglePin}
            onBookmarkDragStart={onBookmarkDragStart}
            onBookmarkDragEnd={onBookmarkDragEnd}
            categories={categories}
            onMoveToCategory={onMoveToCategory}
            resetKey={resetKey}
          />
        </section>
      )}
    </div>
  )
}

/**
 * 书签卡片列表,大数据量启用虚拟滚动,小数据量全量渲染(退化)
 * 虚拟滚动以"行"为单位,每行按当前断点的列数分组,避免卡片退化为单列全宽
 */
function BookmarkCardList({
  bookmarks,
  onEdit,
  onDelete,
  onClick,
  onTogglePin,
  onBookmarkDragStart,
  onBookmarkDragEnd,
  categories,
  onMoveToCategory,
  resetKey,
}: {
  bookmarks: Bookmark[]
  onEdit: (b: Bookmark) => void
  onDelete: (id: string) => void
  onClick: (b: Bookmark) => void
  onTogglePin?: (b: Bookmark) => void
  onBookmarkDragStart?: (b: Bookmark) => void
  onBookmarkDragEnd?: () => void
  categories?: Category[]
  onMoveToCategory?: (b: Bookmark, categoryId: string | null) => void
  resetKey?: string | number
}) {
  const { isPC, isSm, isXl, is2xl } = useMediaQuery()
  const rootFontSize = useRootFontSize()
  const columns = is2xl ? 5 : isXl ? 4 : isPC ? 3 : isSm ? 2 : 1
  const useVirtual = bookmarks.length > VIRTUAL_THRESHOLD
  const cardHeight = CARD_HEIGHT_REM * rootFontSize
  const gridGap = GRID_GAP_REM * rootFontSize
  const viewportHeight = VIRTUAL_VIEWPORT_REM * rootFontSize

  const rows = useMemo(() => {
    const grouped: Bookmark[][] = []
    for (let i = 0; i < bookmarks.length; i += columns) {
      grouped.push(bookmarks.slice(i, i + columns))
    }
    return grouped
  }, [bookmarks, columns])

  const virtual = useVirtualList(rows, cardHeight + gridGap, viewportHeight, {
    resetKey: `${columns}:${resetKey ?? ''}`,
  })

  // 虚拟窗口移动会卸载当前聚焦的卡片;把焦点收回到滚动容器,避免掉到 body
  const listRef = useRef<HTMLDivElement | null>(null)
  const hadFocusInsideRef = useRef(false)
  const { containerRef: virtualContainerRef } = virtual
  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node
      virtualContainerRef(node)
    },
    [virtualContainerRef],
  )
  useEffect(() => {
    if (!hadFocusInsideRef.current) return
    const el = listRef.current
    if (!el) return
    if (document.activeElement === document.body || !el.contains(document.activeElement)) {
      el.focus({ preventScroll: true })
    }
    hadFocusInsideRef.current = false
  }, [virtual.startIndex])

  // roving tabindex:列表只保留一个 Tab 停靠点,方向键在卡片间移动
  const [activeIndex, setActiveIndex] = useState(0)
  useEffect(() => {
    setActiveIndex(0)
  }, [bookmarks.length, resetKey])

  const focusCard = useCallback((index: number) => {
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>(`[data-card-index="${index}"]`)?.focus()
    })
  }, [])

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    const handled = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!handled.includes(e.key) || bookmarks.length === 0) return
    e.preventDefault()
    let next = activeIndex
    if (e.key === 'ArrowRight') next += 1
    else if (e.key === 'ArrowLeft') next -= 1
    else if (e.key === 'ArrowDown') next += columns
    else if (e.key === 'ArrowUp') next -= columns
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = bookmarks.length - 1
    next = Math.max(0, Math.min(bookmarks.length - 1, next))
    if (next === activeIndex) return
    setActiveIndex(next)
    if (useVirtual) virtual.scrollToIndex(Math.floor(next / columns))
    window.setTimeout(() => focusCard(next), 0)
  }

  const handleFocusCapture = (e: React.FocusEvent) => {
    const index = Number((e.target as HTMLElement).getAttribute('data-card-index'))
    if (!Number.isNaN(index)) setActiveIndex(index)
  }

  if (!useVirtual) {
    // 小数据量:全量渲染(退化)
    return (
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- roving tabindex 容器统一处理方向键
      <div
        ref={listRef}
        role="list"
        aria-label="全部书签"
        onKeyDown={handleListKeyDown}
        onFocusCapture={handleFocusCapture}
        className={GRID_COLUMNS_CLASS}
      >
        {bookmarks.map((b, index) => (
          <div key={b.id} role="listitem" aria-setsize={bookmarks.length} aria-posinset={index + 1}>
            <BookmarkCard
              bookmark={b}
              onEdit={onEdit}
              onDelete={onDelete}
              onClick={onClick}
              onTogglePin={onTogglePin}
              onDragStart={onBookmarkDragStart}
              onDragEnd={onBookmarkDragEnd}
              categories={categories}
              onMoveToCategory={onMoveToCategory}
              tabIndex={index === activeIndex ? 0 : -1}
              dataIndex={index}
            />
          </div>
        ))}
      </div>
    )
  }

  // 大数据量:按行虚拟滚动,占位总高防 CLS,仅渲染可视行
  return (
    <div
      ref={setContainerRef}
      data-testid="bookmark-virtual-list"
      tabIndex={-1}
      onScroll={() => {
        const el = listRef.current
        if (el?.contains(document.activeElement)) {
          hadFocusInsideRef.current = true
        }
      }}
      className="overflow-y-auto outline-none"
      style={{ height: viewportHeight }}
    >
      {/* 占位容器:撑开总高,防 CLS */}
      <div style={{ height: virtual.totalHeight, position: 'relative' }}>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- roving tabindex 容器统一处理方向键 */}
        <div
          role="list"
          aria-label="全部书签"
          data-testid="bookmark-virtual-grid"
          onKeyDown={handleListKeyDown}
          onFocusCapture={handleFocusCapture}
          className="absolute inset-x-0 grid gap-3"
          style={{
            top: virtual.offsetY,
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gridAutoRows: `${CARD_HEIGHT_REM}rem`,
          }}
        >
          {virtual.visibleItems.flatMap((row, rowOffset) =>
            row.map((b, column) => {
              const globalIndex = (virtual.startIndex + rowOffset) * columns + column
              return (
                <div
                  key={b.id}
                  role="listitem"
                  aria-setsize={bookmarks.length}
                  aria-posinset={globalIndex + 1}
                  className="h-full"
                >
                  <BookmarkCard
                    bookmark={b}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onClick={onClick}
                    onTogglePin={onTogglePin}
                    onDragStart={onBookmarkDragStart}
                    onDragEnd={onBookmarkDragEnd}
                    categories={categories}
                    onMoveToCategory={onMoveToCategory}
                    tabIndex={globalIndex === activeIndex ? 0 : -1}
                    dataIndex={globalIndex}
                    className="h-full"
                  />
                </div>
              )
            }),
          )}
        </div>
      </div>
    </div>
  )
}

/** 首次使用欢迎状态 */
export function WelcomeState({ onAdd }: { onAdd: () => void }): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <p className="text-2xl">🔖</p>
      <div>
        <p className="text-display">欢迎使用书签导航</p>
        <p className="text-body mt-1 text-muted-foreground">点击下方按钮添加你的第一个书签</p>
      </div>
      <button
        onClick={onAdd}
        className="focus-ring rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        添加书签
      </button>
    </div>
  )
}
