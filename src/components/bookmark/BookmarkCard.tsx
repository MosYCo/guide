/**
 * BookmarkCard 组件 - 单个书签卡片
 * FR-008 图标降级、点击新标签页打开
 * @see specs/001-bookmark-navigation/contracts/ui-contract.md §BookmarkCard
 */

import { useRef, useState } from 'react'
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
import { fallbackIcon, getPlaceholderIcon } from '@/services/favicon'
import { cn } from '@/lib/utils'

export interface BookmarkCardProps {
  bookmark: Bookmark
  onEdit: (bookmark: Bookmark) => void
  onDelete: (bookmarkId: string) => void
  onClick: (bookmark: Bookmark) => void
  /** 可选：拖拽到分类（FR-003 drag to assign） */
  onDragStart?: (bookmark: Bookmark) => void
  /** 可选：拖拽结束/取消时清理状态 */
  onDragEnd?: () => void
  /** 可选：额外样式(虚拟网格用于撑满固定行高) */
  className?: string
}

export function BookmarkCard({
  bookmark,
  onEdit,
  onDelete,
  onClick,
  onDragStart,
  onDragEnd,
  className,
}: BookmarkCardProps) {
  const [iconSrc, setIconSrc] = useState(bookmark.icon)
  const [iconFailedOnce, setIconFailedOnce] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const suppressMenuFocusRef = useRef(false)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const domain = extractDomain(bookmark.url)

  const handleClick = () => onClick(bookmark)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 卡片内嵌“更多操作”等交互控件;只处理卡片自身获得焦点时的 Enter/Space,
    // 否则键盘操作菜单会同时打开书签。
    if (e.target !== e.currentTarget) return
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
      onDragEnd={onDragEnd}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`打开书签：${bookmark.name}`}
      className={cn(
        'group relative cursor-pointer transition-all',
        'hover:-translate-y-0.5 hover:shadow-elevation-md',
        'focus-ring',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2 p-3">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded">
          {/* T015/T024: favicon 原生懒加载 + 解码异步 + onError 二次降级(FR-018/016)
           * 降级链:favicon 失败 → 首字母图标(getLetterIcon via fallbackIcon)→ 首字母也失败 → 纯色块(getPlaceholderIcon) */}
          <img
            src={iconSrc}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-8 w-8"
            onError={() => {
              if (!iconFailedOnce) {
                // 一次降级:首字母图标
                setIconSrc(fallbackIcon(bookmark.name))
                setIconFailedOnce(true)
              } else {
                // 二次降级:纯色块(首字母图标也失败)
                setIconSrc(getPlaceholderIcon())
              }
            }}
          />
        </div>
        <p
          className="text-body line-clamp-1 w-full text-center font-medium"
          title={bookmark.name}
        >
          {bookmark.name}
        </p>
        <p
          className="text-caption line-clamp-1 w-full text-center text-muted-foreground"
          title={domain}
        >
          {domain}
        </p>
      </div>
      <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={menuTriggerRef}
              variant="ghost"
              size="icon"
              className="focus-ring min-h-11 min-w-11 h-7 w-7 sm:min-h-7 sm:min-w-7"
              aria-label="更多操作"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={(e) => {
              // 打开删除确认框时不要让菜单把焦点抢回触发器,
              // 否则 AlertDialogCancel 的默认焦点会被覆盖。
              if (suppressMenuFocusRef.current) {
                e.preventDefault()
                suppressMenuFocusRef.current = false
              }
            }}
          >
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
                suppressMenuFocusRef.current = true
                // 等菜单关闭并释放滚动锁后再开对话框,避免两个 Radix 弹层的锁叠加
                setTimeout(() => setDeleteOpen(true), 0)
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent
          onClick={(e) => e.stopPropagation()}
          onCloseAutoFocus={(e) => {
            // 取消/关闭后把焦点还给“更多操作”;删除后卡片已卸载则不再强求
            e.preventDefault()
            if (menuTriggerRef.current?.isConnected) {
              menuTriggerRef.current.focus()
            }
          }}
        >
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
