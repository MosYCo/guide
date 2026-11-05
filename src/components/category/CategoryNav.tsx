/**
 * CategoryNav 组件 - 统一分类导航
 * PC(≥md 768): 侧栏列表 + 可折叠(收起/展开,持久化)+ 计数 badge 选中态高亮
 * 移动端(<md 768): 底部固定 Tab(全部/分类)+ 侧滑抽屉承载完整列表
 * 废弃移动端顶部横标签栏,改底部 Tab+抽屉
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
  ArrowUp,
  ArrowDown,
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
// CategoryDrawer 静态导入(非 React.lazy)。有意偏离  的"懒加载"注记:
// 抽屉体量小,随 CategoryNav 同 chunk 不影响首屏(首屏不渲染移动端分支),
// 静态导入更简洁,避免 lazy+Suspense 的额外复杂度。
import { CategoryDrawer } from '@/components/category/CategoryDrawer'
import { CategoryIcon } from '@/components/category/CategoryIcon'
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
  /** 分类是否仍在加载 */
  loading?: boolean
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
  loading = false,
  onToggleCollapse,
}: CategoryNavProps) {
  const { isPC, isTablet } = useMediaQuery()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null)
  const mobileCategoriesButtonRef = useRef<HTMLButtonElement | null>(null)

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

  const moveCategoryBy = (index: number, delta: -1 | 1) => {
    if (!onReorder) return
    const target = index + delta
    if (target < 0 || target >= categories.length) return
    const ids = categories.map((c) => c.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    onReorder(ids)
  }

  // PC 侧栏(含平板);折叠态受控于 App
  if (isPC || isTablet) {
    // 折叠态:仅图标按钮
    if (collapsed) {
      return (
        <>
          <nav
            id="category-nav"
            aria-label="分类导航（折叠）"
            className="flex h-full flex-col items-center gap-1 overflow-y-auto p-2 scrollbar-thin"
          >
            <Button
              variant="ghost"
              size="icon"
              className="focus-ring min-h-11 min-w-11"
              onClick={() => onToggleCollapse?.()}
              aria-label="展开侧栏"
              aria-expanded={false}
              aria-controls="category-nav"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="focus-ring min-h-11 min-w-11"
              onClick={() => onSelect(null)}
              aria-label="全部书签"
              aria-current={selectedCategoryId === null ? 'page' : undefined}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            {categories.map((c) => (
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
                aria-current={selectedCategoryId === c.id ? 'page' : undefined}
                title={c.name}
              >
                <CategoryIcon category={c} fallback="letter" className="h-5 w-5" />
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
            returnFocusRef={deleteTriggerRef}
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
        <nav id="category-nav" aria-label="分类导航" className="flex h-full flex-col p-2">
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
                aria-expanded={true}
                aria-controls="category-nav"
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
              onDrop={onBookmarkDrop ? () => onBookmarkDrop(null) : undefined}
            />
            {categories.map((c, index) => (
              <CategoryNavItem
                key={c.id}
                category={c}
                active={selectedCategoryId === c.id}
                count={bookmarkCounts[c.id] ?? 0}
                onSelect={() => onSelect(c.id)}
                onEdit={() => onEdit(c)}
                onDelete={(trigger) => {
                  deleteTriggerRef.current = trigger
                  setDeleteId(c.id)
                }}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={() => setDraggingId(null)}
                onMoveUp={onReorder && index > 0 ? () => moveCategoryBy(index, -1) : undefined}
                onMoveDown={
                  onReorder && index < categories.length - 1
                    ? () => moveCategoryBy(index, 1)
                    : undefined
                }
                isPC
                onBookmarkDrop={onBookmarkDrop ? () => onBookmarkDrop(c.id) : undefined}
              />
            ))}
            {categories.length === 0 && (
              <p className="text-caption px-2 py-4 text-muted-foreground">
                {loading ? '加载中…' : '暂无分类，点击上方 + 创建'}
              </p>
            )}
          </div>
        </nav>
        <DeleteConfirm
          open={!!deleteId}
          returnFocusRef={deleteTriggerRef}
          onCancel={() => setDeleteId(null)}
          onConfirm={() => {
            if (deleteId) onDelete(deleteId)
            setDeleteId(null)
          }}
        />
      </>
    )
  }

  // 移动端底部固定 Tab(全部 / 分类)+ 侧滑抽屉
  return (
    <>
      <nav
        aria-label="底部导航"
        style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background/95 px-2 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      >
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'focus-ring flex min-h-11 flex-1 flex-col items-center gap-0.5 rounded-md py-1',
            selectedCategoryId === null ? 'text-primary' : 'text-muted-foreground',
          )}
          aria-label="全部书签"
          aria-current={selectedCategoryId === null ? 'page' : undefined}
        >
          <LayoutGrid className="h-5 w-5" />
          <span className="text-caption">全部</span>
        </button>
        <button
          ref={mobileCategoriesButtonRef}
          onClick={() => setDrawerOpen(true)}
          className={cn(
            'focus-ring flex min-h-11 flex-1 flex-col items-center gap-0.5 rounded-md py-1',
            selectedCategoryId !== null ? 'text-primary' : 'text-muted-foreground',
          )}
          aria-label={
            selectedCategoryId
              ? `打开分类列表，当前：${
                  categories.find((c) => c.id === selectedCategoryId)?.name ?? '分类'
                }`
              : '打开分类列表'
          }
          aria-current={selectedCategoryId !== null ? 'page' : undefined}
          aria-expanded={drawerOpen}
          aria-haspopup="dialog"
        >
          <Folder className="h-5 w-5" />
          <span
            className="text-caption max-w-[6em] truncate"
            title={
              selectedCategoryId
                ? (categories.find((c) => c.id === selectedCategoryId)?.name ?? '分类')
                : '分类'
            }
          >
            {selectedCategoryId
              ? (categories.find((c) => c.id === selectedCategoryId)?.name ?? '分类')
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
        onEdit={onEdit}
        onRequestDelete={(id) => {
          deleteTriggerRef.current = mobileCategoriesButtonRef.current
          setDeleteId(id)
        }}
        onReorder={onReorder}
        loading={loading}
      />
      <DeleteConfirm
        open={!!deleteId}
        returnFocusRef={deleteTriggerRef}
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
  onDrop,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count: number
  onDrop?: () => void
}) {
  return (
    <button
      onClick={onClick}
      onDragOver={(e) => onDrop && e.preventDefault()}
      onDrop={onDrop}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'focus-ring flex min-h-9 w-full items-center gap-2 rounded-md px-2 py-1.5 text-body',
        // 选中态高亮
        active
          ? 'border-l-2 border-primary bg-accent font-semibold text-accent-foreground'
          : 'hover:bg-accent/50',
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {/*: 计数 badge */}
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
  onMoveUp,
  onMoveDown,
  isPC,
  onBookmarkDrop,
}: {
  category: Category
  active: boolean
  count: number
  onSelect: () => void
  onEdit: () => void
  onDelete: (trigger: HTMLButtonElement | null) => void
  onDragStart: (id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDrop: (id: string) => void
  onDragEnd?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  isPC: boolean
  onBookmarkDrop?: () => void
}) {
  const suppressMenuFocusRef = useRef(false)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)

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
        active
          ? 'border-l-2 border-primary bg-accent font-semibold text-accent-foreground'
          : 'hover:bg-accent/50',
      )}
    >
      {isPC && (
        <GripVertical className="h-3 w-3 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100" />
      )}
      <button
        onClick={onSelect}
        aria-current={active ? 'page' : undefined}
        className="focus-ring flex min-h-9 flex-1 items-center gap-2 rounded-md text-left"
      >
        <CategoryIcon category={category} fallback="folder" className="h-4 w-4" />
        <span className="flex-1 truncate" title={category.name}>
          {category.name}
        </span>
        <span className="text-xs text-muted-foreground">{count}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={menuTriggerRef}
            variant="ghost"
            size="icon"
            className="h-11 w-11 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 lg:h-6 lg:w-6"
            aria-label={`分类操作：${category.name}`}
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
          <DropdownMenuItem
            onClick={() => {
              suppressMenuFocusRef.current = true
              // 等菜单关闭并释放滚动锁后再开编辑框，避免 Radix 弹层锁叠加
              setTimeout(() => onEdit(), 0)
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            编辑
          </DropdownMenuItem>
          {onMoveUp && (
            <DropdownMenuItem onClick={onMoveUp}>
              <ArrowUp className="mr-2 h-4 w-4" />
              上移
            </DropdownMenuItem>
          )}
          {onMoveDown && (
            <DropdownMenuItem onClick={onMoveDown}>
              <ArrowDown className="mr-2 h-4 w-4" />
              下移
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => {
              suppressMenuFocusRef.current = true
              // 等菜单关闭并释放滚动锁后再开确认框,避免 Radix 弹层锁叠加
              setTimeout(() => onDelete(menuTriggerRef.current), 0)
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
  returnFocusRef,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  returnFocusRef?: React.RefObject<HTMLButtonElement | null>
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          const el = returnFocusRef?.current
          if (el?.isConnected) el.focus()
        }}
      >
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
