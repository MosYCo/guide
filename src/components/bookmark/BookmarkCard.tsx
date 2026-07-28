/**
 * BookmarkCard 组件 - 单个书签卡片
 * FR-008 图标降级、点击新标签页打开
 * @see specs/001-bookmark-navigation/contracts/ui-contract.md §BookmarkCard
 */

import { useState } from 'react'
import { MoreVertical, Pencil, Trash2, ExternalLink } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Bookmark } from '@/types'
import { extractDomain } from '@/utils/url'
import { fallbackIcon } from '@/services/favicon'
import { cn } from '@/lib/utils'

export interface BookmarkCardProps {
  bookmark: Bookmark
  onEdit: (bookmark: Bookmark) => void
  onDelete: (bookmarkId: string) => void
  onClick: (bookmark: Bookmark) => void
  /** 可选：拖拽到分类（FR-003 drag to assign） */
  onDragStart?: (bookmark: Bookmark) => void
}

export function BookmarkCard({
  bookmark,
  onEdit,
  onDelete,
  onClick,
  onDragStart,
}: BookmarkCardProps) {
  const [iconSrc, setIconSrc] = useState(bookmark.icon)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const domain = extractDomain(bookmark.url)

  const handleClick = () => onClick(bookmark)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(bookmark)
    }
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      draggable={!!onDragStart}
      onDragStart={() => onDragStart?.(bookmark)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`打开书签：${bookmark.name}`}
      className={cn(
        'group relative cursor-pointer transition-all',
        'hover:-translate-y-0.5 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div className="flex flex-col items-center gap-2 p-3">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded">
          <img
            src={iconSrc}
            alt=""
            className="h-8 w-8"
            onError={() => setIconSrc(fallbackIcon(bookmark.name))}
          />
        </div>
        <p
          className="line-clamp-1 w-full text-center text-sm font-medium"
          title={bookmark.name}
        >
          {bookmark.name}
        </p>
        <p
          className="line-clamp-1 w-full text-center text-xs text-muted-foreground"
          title={domain}
        >
          {domain}
        </p>
      </div>
      <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="更多操作"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onClick(bookmark)
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              打开
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onEdit(bookmark)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                setDeleteOpen(true)
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>删除书签</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除「{bookmark.name}」？该操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation()
                onDelete(bookmark.id)
                setDeleteOpen(false)
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
