/**
 * BookmarkGrid 组件 - 书签网格展示
 * FR-009 按分类分组、FR-011 空状态、FR-017 最近访问区域
 * @see specs/001-bookmark-navigation/contracts/ui-contract.md §BookmarkGrid
 */

import type { ReactNode } from 'react'
import { BookmarkCard } from '@/components/bookmark/BookmarkCard'
import { Skeleton } from '@/components/ui/skeleton'
import type { Bookmark } from '@/types'
import { cn } from '@/lib/utils'

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
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  )
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
}: BookmarkGridProps) {
  const hasRecent = recentBookmarks && recentBookmarks.length > 0
  const hasBookmarks = bookmarks.length > 0

  if (loading) return <GridSkeleton />

  // 搜索无结果（有书签数据但过滤后为空）
  if (searchNoResult) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">未找到匹配的书签</p>
        {onClearSearch && (
          <button
            onClick={onClearSearch}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
          >
            清除搜索
          </button>
        )}
      </div>
    )
  }

  if (!hasBookmarks && !hasRecent) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className="flex flex-col gap-6">
      {hasRecent && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
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
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            全部书签
          </h2>
          <div
            className={cn(
              'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
            )}
          >
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
        </section>
      )}
    </div>
  )
}

/** 首次使用欢迎状态 */
export function WelcomeState({ onAdd }: { onAdd: () => void }): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <p className="text-2xl">🔖</p>
      <div>
        <p className="text-lg font-semibold">欢迎使用书签导航</p>
        <p className="mt-1 text-sm text-muted-foreground">
          点击下方按钮添加你的第一个书签
        </p>
      </div>
      <button
        onClick={onAdd}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        添加书签
      </button>
    </div>
  )
}
