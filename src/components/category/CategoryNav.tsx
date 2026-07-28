/**
 * CategoryNav 组件 - 统一分类导航（PC 侧边栏 + 移动端标签栏）
 * FR-003 分类导航、FR-009 按分类过滤、FR-007 编辑/删除分类、拖拽排序
 * @see specs/001-bookmark-navigation/contracts/ui-contract.md §CategoryNav
 */

import { useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Folder,
  LayoutGrid,
  GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { Category } from '@/types'
import { cn } from '@/lib/utils'

export interface CategoryNavProps {
  categories: Category[]
  selectedCategoryId: string | null
  bookmarkCounts: Record<string, number>
  totalCount: number
  onSelect: (categoryId: string | null) => void
  onAdd: () => void
  onEdit: (category: Category) => void
  onDelete: (categoryId: string) => void
  /** 拖拽重排序回调 */
  onReorder?: (ids: string[]) => void
  /** 书签拖放到分类目标回调（移动书签到该分类） */
  onBookmarkDrop?: (categoryId: string | null) => void
}

export function CategoryNav({
  categories,
  selectedCategoryId,
  bookmarkCounts,
  totalCount,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onReorder,
  onBookmarkDrop,
}: CategoryNavProps) {
  const { isPC } = useMediaQuery()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const handleDragStart = (id: string) => {
    if (!onReorder) return
    setDraggingId(id)
  }
  const handleDragOver = (e: React.DragEvent, overId: string) => {
    if (!onReorder || !draggingId || draggingId === overId) return
    e.preventDefault()
  }
  const handleDrop = (overId: string) => {
    if (!onReorder || !draggingId || draggingId === overId) return
    const ids = categories.map((c) => c.id)
    const from = ids.indexOf(draggingId)
    const to = ids.indexOf(overId)
    if (from === -1 || to === -1) return
    ids.splice(to, 0, ids.splice(from, 1)[0])
    onReorder(ids)
    setDraggingId(null)
  }

  const allItem = (
    <NavItem
      active={selectedCategoryId === null}
      onClick={() => onSelect(null)}
      icon={<LayoutGrid className="h-4 w-4" />}
      label="全部"
      count={totalCount}
      isPC={isPC}
      onDrop={onBookmarkDrop ? () => onBookmarkDrop(null) : undefined}
    />
  )

  if (isPC) {
    return (
      <>
        <nav className="flex h-full flex-col p-2">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-sm font-medium">分类</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onAdd}
              aria-label="新建分类"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 space-y-0.5 overflow-y-auto scrollbar-thin">
            {allItem}
            {categories.map((c) => (
              <CategoryNavItem
                key={c.id}
                category={c}
                active={selectedCategoryId === c.id}
                count={bookmarkCounts[c.id] ?? 0}
                onSelect={() => onSelect(c.id)}
                onEdit={() => onEdit(c)}
                onDelete={() => setDeleteId(c.id)}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isPC
                onBookmarkDrop={
                  onBookmarkDrop ? () => onBookmarkDrop(c.id) : undefined
                }
              />
            ))}
            {categories.length === 0 && (
              <p className="px-2 py-4 text-xs text-muted-foreground">
                暂无分类，点击上方 + 创建
              </p>
            )}
          </div>
        </nav>
        <DeleteConfirm
          open={!!deleteId}
          onCancel={() => setDeleteId(null)}
          onConfirm={() => {
            if (deleteId) onDelete(deleteId)
            setDeleteId(null)
          }}
        />
      </>
    )
  }

  // 移动端：横向滚动标签栏
  return (
    <>
      <nav className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-sm',
            selectedCategoryId === null
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground',
          )}
        >
          全部
          <span className="text-xs opacity-70">{totalCount}</span>
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            onContextMenu={(e) => {
              e.preventDefault()
              onEdit(c)
            }}
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-sm',
              selectedCategoryId === c.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground',
            )}
          >
            {c.name}
            <span className="text-xs opacity-70">
              {bookmarkCounts[c.id] ?? 0}
            </span>
          </button>
        ))}
        <button
          onClick={onAdd}
          className="flex shrink-0 items-center rounded-md border border-dashed border-input px-3 py-1.5 text-sm hover:bg-accent"
          aria-label="新建分类"
        >
          <Plus className="h-4 w-4" />
        </button>
      </nav>
      <DeleteConfirm
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) onDelete(deleteId)
          setDeleteId(null)
        }}
      />
    </>
  )
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  count,
  isPC,
  onDrop,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count: number
  isPC: boolean
  onDrop?: () => void
}) {
  if (!isPC) return null
  return (
    <button
      onClick={onClick}
      onDragOver={(e) => onDrop && e.preventDefault()}
      onDrop={onDrop}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm',
        active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      <span className="text-xs text-muted-foreground">{count}</span>
    </button>
  )
}

function CategoryNavItem({
  category,
  active,
  count,
  onSelect,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isPC,
  onBookmarkDrop,
}: {
  category: Category
  active: boolean
  count: number
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onDragStart: (id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDrop: (id: string) => void
  isPC: boolean
  onBookmarkDrop?: () => void
}) {
  return (
    <div
      draggable={!!isPC}
      onDragStart={() => onDragStart(category.id)}
      onDragOver={(e) => {
        onDragOver(e, category.id)
        if (onBookmarkDrop) e.preventDefault()
      }}
      onDrop={() => {
        onDrop(category.id)
        onBookmarkDrop?.()
      }}
      className={cn(
        'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm',
        active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
      )}
    >
      {isPC && (
        <GripVertical className="h-3 w-3 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100" />
      )}
      <button onClick={onSelect} className="flex flex-1 items-center gap-2 text-left">
        <Folder className="h-4 w-4" />
        <span className="flex-1 truncate" title={category.name}>
          {category.name}
        </span>
        <span className="text-xs text-muted-foreground">{count}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            aria-label="分类操作"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            重命名
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function DeleteConfirm({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除分类</AlertDialogTitle>
          <AlertDialogDescription>
            删除分类后，该分类下的书签将移至「未分类」，不会被删除。确定继续吗？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
