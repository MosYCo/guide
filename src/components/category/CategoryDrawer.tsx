/**
 * CategoryDrawer 组件 - 移动端侧滑抽屉
 * 承载完整分类列表,复用 Radix Dialog,含遮罩与焦点陷阱
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowDown, ArrowUp, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { CategoryIcon } from '@/components/category/CategoryIcon'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

export interface CategoryDrawerProps {
  open: boolean
  categories: Category[]
  selectedCategoryId: string | null
  bookmarkCounts: Record<string, number>
  totalCount: number
  onSelect: (categoryId: string | null) => void
  onClose: () => void
  onEdit: (category: Category) => void
  onRequestDelete: (categoryId: string) => void
  onReorder?: (ids: string[]) => void
  loading?: boolean
}

export function CategoryDrawer({
  open,
  categories,
  selectedCategoryId,
  bookmarkCounts,
  totalCount,
  onSelect,
  onClose,
  onEdit,
  onRequestDelete,
  onReorder,
  loading = false,
}: CategoryDrawerProps) {
  const move = (index: number, delta: -1 | 1) => {
    if (!onReorder) return
    const target = index + delta
    if (target < 0 || target >= categories.length) return
    const ids = categories.map((c) => c.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    onReorder(ids)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/* Radix Dialog 默认含焦点陷阱(FocusScope)与遮罩 */}
      <DialogContent
        className="inset-y-0 left-0 top-auto max-h-screen w-80 max-w-[85vw] translate-x-0 translate-y-0 rounded-l-none rounded-r-lg border-l-0 p-0"
        // 覆盖默认居中定位,改为左侧贴边
        style={{ left: 0, top: 0, transform: 'none', translate: 'none' }}
      >
        <DialogTitle className="text-h1 sr-only px-4 pt-4">分类列表</DialogTitle>
        <DialogDescription className="sr-only px-4">选择一个分类以筛选书签</DialogDescription>
        <nav aria-label="分类列表" className="flex h-full max-h-[80vh] flex-col">
          <div className="flex-1 overflow-y-auto p-2">
            <DrawerItem
              active={selectedCategoryId === null}
              label="全部"
              count={totalCount}
              onClick={() => {
                onSelect(null)
                onClose()
              }}
            />
            {categories.map((c, index) => (
              <DrawerItem
                key={c.id}
                category={c}
                active={selectedCategoryId === c.id}
                label={c.name}
                count={bookmarkCounts[c.id] ?? 0}
                onClick={() => {
                  onSelect(c.id)
                  onClose()
                }}
                onEdit={() => {
                  onEdit(c)
                  onClose()
                }}
                onRequestDelete={() => {
                  onRequestDelete(c.id)
                  onClose()
                }}
                onMoveUp={onReorder && index > 0 ? () => move(index, -1) : undefined}
                onMoveDown={
                  onReorder && index < categories.length - 1 ? () => move(index, 1) : undefined
                }
              />
            ))}
            {categories.length === 0 && (
              <p className="text-caption px-2 py-4 text-muted-foreground">
                {loading ? '加载中…' : '暂无分类'}
              </p>
            )}
          </div>
        </nav>
      </DialogContent>
    </Dialog>
  )
}

function DrawerItem({
  category,
  active,
  label,
  count,
  onClick,
  onEdit,
  onRequestDelete,
  onMoveUp,
  onMoveDown,
}: {
  category?: Category
  active: boolean
  label: string
  count: number
  onClick: () => void
  onEdit?: () => void
  onRequestDelete?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'focus-ring flex w-full min-h-11 flex-1 items-center gap-2 rounded-md px-3 py-2 text-body',
          active
            ? 'border-l-2 border-primary bg-accent font-semibold text-accent-foreground'
            : 'hover:bg-accent/50',
        )}
      >
        <CategoryIcon category={category} fallback="folder" className="h-4 w-4" />
        <span className="flex-1 truncate text-left" title={label}>
          {label}
        </span>
        <span className="text-caption text-muted-foreground">{count}</span>
      </button>
      {category && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="focus-ring min-h-11 min-w-11 shrink-0"
              aria-label={`分类操作：${label}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
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
            <DropdownMenuItem className="text-destructive" onClick={onRequestDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
