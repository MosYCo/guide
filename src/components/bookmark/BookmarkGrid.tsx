/**
 * BookmarkGrid 组件 - 书签网格展示
 * FR-009 按分类分组、FR-011 空状态、FR-017 最近访问区域
 * T009: 加载/空/错误状态收敛为 StateLoading/StateEmpty 组件(FR-003)
 * T023: 大数据量启用虚拟滚动(FR-018),占位总高防 CLS
 * @see specs/001-ui-ux-overhaul/contracts/ui-contract.md §2
 */

import type { ReactNode } from 'react'
import { BookmarkCard } from '@/components/bookmark/BookmarkCard'
import { StateEmpty, StateLoading } from '@/components/ui/state-feedback'
import { useVirtualList } from '@/hooks/useVirtualList'
import type { Bookmark } from '@/types'
import { cn } from '@/lib/utils'

// T023: 虚拟滚动阈值——超过此数启用,否则全量渲染(小于一屏退化)
const VIRTUAL_THRESHOLD = 60
// 单卡高度(定高,虚拟滚动需要);与 BookmarkCard 实际高度对齐
const CARD_HEIGHT = 130
// 虚拟容器可视高度
const VIRTUAL_VIEWPORT = 600

export interface BookmarkGridProps {
  bookmarks: Bookmark[]
  onEdit: (bookmark: Bookmark) => void
  onDelete: (bookmarkId: string) => void
  onClick: (bookmark: Bookmark) => void
  emptyMessage?: string
  /** 可选：在网格上方渲染最近访问区域 */
  recentBookmarks?: Bookmark[]
  /** 是否处于搜索无结果状态 */
  searchNoResult?: boolean
  onClearSearch?: () => void
  /** 书签拖拽开始（用于拖到分类） */
  onBookmarkDragStart?: (bookmark: Bookmark) => void
  /** 是否显示加载骨架 */
  loading?: boolean
  /** T009: 空状态引导动作(添加书签) */
  onAdd?: () => void
}

export function BookmarkGrid({
  bookmarks,
  onEdit,
  onDelete,
  onClick,
  emptyMessage = '暂无书签',
  recentBookmarks,
  searchNoResult,
  onClearSearch,
  onBookmarkDragStart,
  loading,
  onAdd,
}: BookmarkGridProps) {
  const hasRecent = recentBookmarks && recentBookmarks.length > 0
  const hasBookmarks = bookmarks.length > 0

  // T009: 加载态统一为 StateLoading
  if (loading) return <StateLoading rows={12} />

  // 搜索无结果:空状态 + 引导动作(清除搜索)
  if (searchNoResult) {
    return (
      <StateEmpty
        message="未找到匹配的书签"
        action={
          onClearSearch && (
            <button
              onClick={onClearSearch}
              className="focus-ring rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              清除搜索
            </button>
          )
        }
      />
    )
  }

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
    <div className="flex flex-col gap-6">
      {hasRecent && (
        <section>
          <h2 className="text-h1 mb-2 text-muted-foreground">
            最近访问
          </h2>
          <div
            className={cn(
              'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
            )}
          >
            {recentBookmarks!.map((b) => (
              <BookmarkCard
                key={b.id}
                bookmark={b}
                onEdit={onEdit}
                onDelete={onDelete}
                onClick={onClick}
                onDragStart={onBookmarkDragStart}
              />
            ))}
          </div>
        </section>
      )}
      {hasBookmarks && (
        <section>
          <h2 className="text-h1 mb-2 text-muted-foreground">
            全部书签
          </h2>
          <BookmarkCardList
            bookmarks={bookmarks}
            onEdit={onEdit}
            onDelete={onDelete}
            onClick={onClick}
            onBookmarkDragStart={onBookmarkDragStart}
          />
        </section>
      )}
    </div>
  )
}

/**
 * T023: 书签卡片列表,大数据量启用虚拟滚动,小数据量全量渲染(退化)
 * 虚拟滚动用单列纵向(每"行"含多个卡片)以复用 useVirtualList 的纵向模型
 */
function BookmarkCardList({
  bookmarks,
  onEdit,
  onDelete,
  onClick,
  onBookmarkDragStart,
}: {
  bookmarks: Bookmark[]
  onEdit: (b: Bookmark) => void
  onDelete: (id: string) => void
  onClick: (b: Bookmark) => void
  onBookmarkDragStart?: (b: Bookmark) => void
}) {
  // 按"行"分组成虚拟滚动单元(每行 = 一屏列数)
  // 简化:单卡即一行,容器用 CSS grid;虚拟滚动按单卡纵向定位
  const useVirtual = bookmarks.length > VIRTUAL_THRESHOLD
  const virtual = useVirtualList(bookmarks, CARD_HEIGHT, VIRTUAL_VIEWPORT)

  if (!useVirtual) {
    // 小数据量:全量渲染(退化)
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {bookmarks.map((b) => (
          <BookmarkCard
            key={b.id}
            bookmark={b}
            onEdit={onEdit}
            onDelete={onDelete}
            onClick={onClick}
            onDragStart={onBookmarkDragStart}
          />
        ))}
      </div>
    )
  }

  // 大数据量:虚拟滚动,占位总高防 CLS,仅渲染可视区
  return (
    <div
      ref={virtual.containerRef}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 overflow-y-auto"
      style={{ height: VIRTUAL_VIEWPORT, alignContent: 'start' }}
    >
      {/* 占位容器:撑开总高,防 CLS */}
      <div style={{ height: virtual.totalHeight, gridColumn: '1 / -1', position: 'relative' }}>
        {virtual.visibleItems.map((b, vi) => {
          const actualIndex = Math.round(virtual.offsetY / CARD_HEIGHT) + vi
          return (
            <div
              key={b.id}
              style={{ position: 'absolute', top: actualIndex * CARD_HEIGHT, left: 0, right: 0, height: CARD_HEIGHT }}
            >
              {/* 卡片在实际网格单元内;外层绝对定位定行 */}
              <div className="h-full">
                <BookmarkCard
                  bookmark={b}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onClick={onClick}
                  onDragStart={onBookmarkDragStart}
                />
              </div>
            </div>
          )
        })}
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
        <p className="text-body mt-1 text-muted-foreground">
          点击下方按钮添加你的第一个书签
        </p>
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
