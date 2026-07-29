/**
 * CategoryDrawer 组件 - 移动端侧滑抽屉
 * T020: 承载完整分类列表,复用 Radix Dialog,含遮罩与焦点陷阱
 * @see specs/001-ui-ux-overhaul/contracts/ui-contract.md §5
 */

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Folder } from 'lucide-react'
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
}

export function CategoryDrawer({
  open,
  categories,
  selectedCategoryId,
  bookmarkCounts,
  totalCount,
  onSelect,
  onClose,
}: CategoryDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/* Radix Dialog 默认含焦点陷阱(FocusScope)与遮罩(FR-014) */}
      <DialogContent
        className="inset-y-0 left-0 top-auto max-h-screen w-80 max-w-[85vw] translate-x-0 translate-y-0 rounded-l-none rounded-r-lg border-l-0 p-0"
        // 覆盖默认居中定位,改为左侧贴边
        style={{ left: 0, top: 0, transform: 'none', translate: 'none' }}
      >
        <DialogTitle className="text-h1 sr-only px-4 pt-4">分类列表</DialogTitle>
        <DialogDescription className="sr-only px-4">
          选择一个分类以筛选书签
        </DialogDescription>
        <nav className="flex h-full max-h-[80vh] flex-col">
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
            {categories.map((c) => (
              <DrawerItem
                key={c.id}
                active={selectedCategoryId === c.id}
                label={c.name}
                count={bookmarkCounts[c.id] ?? 0}
                onClick={() => {
                  onSelect(c.id)
                  onClose()
                }}
              />
            ))}
            {categories.length === 0 && (
              <p className="text-caption px-2 py-4 text-muted-foreground">
                暂无分类
              </p>
            )}
          </div>
        </nav>
      </DialogContent>
    </Dialog>
  )
}

function DrawerItem({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'focus-ring flex w-full min-h-11 items-center gap-2 rounded-md px-3 py-2 text-body',
        active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
      )}
    >
      <Folder className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1 truncate text-left">{label}</span>
      <span className="text-caption text-muted-foreground">{count}</span>
    </button>
  )
}
