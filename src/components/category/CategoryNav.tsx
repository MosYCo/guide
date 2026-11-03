/**
 * CategoryNav 组件 - 统一分类导航
 * PC(≥md 768): 侧栏列表 + 可折叠(收起/展开,持久化)+ 计数 badge 选中态高亮
 * 移动端(<md 768): 底部固定 Tab(全部/分类)+ 侧滑抽屉承载完整列表
 * T021: 废弃移动端顶部横标签栏,改底部 Tab+抽屉(FR-009/014)
 * @see specs/001-ui-ux-overhaul/contracts/ui-contract.md §5
 */

import { useRef, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Folder,
  LayoutGrid,
  GripVertical,
  PanelLeftClose,
  PanelLeft,
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
// T039: CategoryDrawer 静态导入(非 React.lazy)。有意偏离 T021 的"懒加载"注记:
// 抽屉体量小,随 CategoryNav 同 chunk 不影响首屏(首屏不渲染移动端分支),
// 静态导入更简洁,避免 lazy+Suspense 的额外复杂度。
import { CategoryDrawer } from '@/components/category/CategoryDrawer'
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
  /** 受控折叠态(PC 侧栏);由 App 上提,AppLayout 据此切宽度 */
  collapsed?: boolean
  /** 切换折叠态(收起/展开) */
  onToggleCollapse?: () => void
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
  collapsed = false,
  onToggleCollapse,
}: CategoryNavProps) {
  const { isPC, isTablet } = useMediaQuery()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  // T021: PC 侧栏(含平板);折叠态受控于 App
  if (isPC || isTablet) {
    // 折叠态:仅图标按钮
    if (collapsed) {
      return (
        <>
          <nav className="flex h-full flex-col items-center gap-1 p-2">
            <Button
              variant="ghost"
              size="icon"
              className="focus-ring min-h-11 min-w-11"
              onClick={() => onToggleCollapse?.()}
              aria-label="展开侧栏"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="focus-ring min-h-11 min-w-11"
              onClick={() => onSelect(null)}
              aria-label="全部书签"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            {categories.slice(0, 8).map((c) => (
              <Button
                key={c.id}
                variant="ghost"
                size="icon"
                className={cn(
                  'focus-ring min-h-11 min-w-11',
                  selectedCategoryId === c.id && 'bg-accent text-accent-foreground',
                )}
                onClick={() => onSelect(c.id)}
                aria-label={c.name}
              >
                <Folder className="h-4 w-4" />
              </Button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="focus-ring min-h-11 min-w-11"
              onClick={onAdd}
              aria-label="新建分类"
            >
              <Plus className="h-4 w-4" />
            </Button>
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

    // 展开态:完整侧栏(沿用既有结构)
    return (
      <>
        <nav className="flex h-full flex-col p-2">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-h1">分类</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="focus-ring min-h-11 min-w-11"
                onClick={onAdd}
                aria-label="新建分类"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="focus-ring min-h-11 min-w-11"
                onClick={() => onToggleCollapse?.()}
                aria-label="收起侧栏"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 space-y-0.5 overflow-y-auto scrollbar-thin">
            <NavItem
              active={selectedCategoryId === null}
              onClick={() => onSelect(null)}
              icon={<LayoutGrid className="h-4 w-4" />}
              label="全部"
              count={totalCount}
              isPC={isPC}
              onDrop={onBookmarkDrop ? () => onBookmarkDrop(null) : undefined}
            />
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
                onDragEnd={() => setDraggingId(null)}
                isPC
                onBookmarkDrop={
                  onBookmarkDrop ? () => onBookmarkDrop(c.id) : undefined
                }
              />
            ))}
            {categories.length === 0 && (
              <p className="text-caption px-2 py-4 text-muted-foreground">
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

  // T021: 移动端底部固定 Tab(全部 / 分类)+ 侧滑抽屉
  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background/95 px-2 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'focus-ring flex min-h-11 flex-1 flex-col items-center gap-0.5 rounded-md py-1',
            selectedCategoryId === null
              ? 'text-primary'
              : 'text-muted-foreground',
          )}
          aria-label="全部书签"
          aria-current={selectedCategoryId === null ? 'page' : undefined}
        >
          <LayoutGrid className="h-5 w-5" />
          <span className="text-caption">全部</span>
        </button>
        <button
          onClick={() => setDrawerOpen(true)}
          className={cn(
            'focus-ring flex min-h-11 flex-1 flex-col items-center gap-0.5 rounded-md py-1',
            selectedCategoryId !== null ? 'text-primary' : 'text-muted-foreground',
          )}
          aria-label="打开分类列表"
          aria-haspopup="dialog"
        >
          <Folder className="h-5 w-5" />
          <span className="text-caption">
            {selectedCategoryId
              ? categories.find((c) => c.id === selectedCategoryId)?.name ?? '分类'
              : '分类'}
          </span>
        </button>
        <button
          onClick={onAdd}
          className="focus-ring flex min-h-11 flex-1 flex-col items-center gap-0.5 rounded-md py-1 text-muted-foreground"
          aria-label="新建分类"
        >
          <Plus className="h-5 w-5" />
          <span className="text-caption">新建</span>
        </button>
      </nav>
      <CategoryDrawer
        open={drawerOpen}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        bookmarkCounts={bookmarkCounts}
        totalCount={totalCount}
        onSelect={onSelect}
        onClose={() => setDrawerOpen(false)}
      />
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
        'focus-ring flex min-h-9 w-full items-center gap-2 rounded-md px-2 py-1.5 text-body',
        // T021: 选中态高亮(FR-009)
        active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {/* T021: 计数 badge */}
      <span
        className={cn(
          'text-caption rounded-full px-1.5 py-0.5',
          active ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
        )}
      >
        {count}
      </span>
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
  onDragEnd,
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
  onDragEnd?: () => void
  isPC: boolean
  onBookmarkDrop?: () => void
}) {
  const suppressMenuFocusRef = useRef(false)

  return (
    <div
      draggable={!!isPC}
      onDragStart={() => onDragStart(category.id)}
      onDragEnd={onDragEnd}
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
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(e) => {
            // 打开删除确认框时避免菜单抢回焦点,确保 AlertDialogCancel 默认聚焦
            if (suppressMenuFocusRef.current) {
              e.preventDefault()
              suppressMenuFocusRef.current = false
            }
          }}
        >
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            重命名
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => {
              suppressMenuFocusRef.current = true
              // 等菜单关闭并释放滚动锁后再开确认框,避免 Radix 弹层锁叠加
              setTimeout(onDelete, 0)
            }}
          >
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
