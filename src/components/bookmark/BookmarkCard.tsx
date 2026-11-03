/**
 * BookmarkCard 组件 - 单个书签卡片
 * 图标降级、点击新标签页打开
 */

import { useEffect, useRef, useState } from 'react'
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Bookmark, Category } from '@/types'
import { displayDomain } from '@/utils/url'
import { fallbackIcon, getPlaceholderIcon, resolveIcon } from '@/services/favicon'
import { cn } from '@/lib/utils'

export interface BookmarkCardProps {
  bookmark: Bookmark
  onEdit: (bookmark: Bookmark) => void
  onDelete: (bookmarkId: string) => void
  onClick: (bookmark: Bookmark) => void
  /** 可选：拖拽到分类（drag to assign） */
  onDragStart?: (bookmark: Bookmark) => void
  /** 可选：拖拽结束/取消时清理状态 */
  onDragEnd?: () => void
  /** 可选：键盘/触屏“移动到分类”入口 */
  categories?: Category[]
  onMoveToCategory?: (bookmark: Bookmark, categoryId: string | null) => void
  /** 可选：虚拟列表 roving tabindex / 定位 */
  tabIndex?: number
  dataIndex?: number
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
  categories,
  onMoveToCategory,
  tabIndex = 0,
  dataIndex,
  className,
}: BookmarkCardProps) {
  const [iconSrc, setIconSrc] = useState(
    () => bookmark.icon || resolveIcon(bookmark.url, bookmark.name),
  )
  const [iconFailedOnce, setIconFailedOnce] = useState(false)

  // 编辑保存后同一个卡片实例会复用,图标 state 必须跟随 bookmark 更新
  useEffect(() => {
    setIconSrc(bookmark.icon || resolveIcon(bookmark.url, bookmark.name))
    setIconFailedOnce(false)
  }, [bookmark.icon, bookmark.url, bookmark.name])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const suppressMenuFocusRef = useRef(false)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const domain = displayDomain(bookmark.url)

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
      tabIndex={tabIndex}
      data-card-index={dataIndex}
      draggable={!!onDragStart}
      onDragStart={(e) => {
        // Firefox 需要 setData 才会启动拖拽
        e.dataTransfer?.setData('text/plain', bookmark.id)
        onDragStart?.(bookmark)
      }}
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
          {/* favicon 原生懒加载 + 解码异步 + onError 二次降级
           * 降级链:favicon 失败 → 首字母图标(getLetterIcon via fallbackIcon)→ 首字母也失败 → 纯色块(getPlaceholderIcon) */}
          <img
            src={iconSrc}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
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
        <p className="text-body line-clamp-1 w-full text-center font-medium" title={bookmark.name}>
          {bookmark.name}
        </p>
        <p
          className="text-caption line-clamp-1 w-full text-center text-muted-foreground"
          title={domain}
        >
          {domain}
        </p>
      </div>
      <div className="bookmark-actions absolute right-1 top-1 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={menuTriggerRef}
              variant="ghost"
              size="icon"
              className="focus-ring h-7 w-7 min-h-11 min-w-11 md:min-h-7 md:min-w-7"
              aria-label={`更多操作：${bookmark.name}`}
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
            {categories && onMoveToCategory && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>移动到分类</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onMoveToCategory(bookmark, null)
                    }}
                  >
                    未分类
                  </DropdownMenuItem>
                  {categories.map((category) => (
                    <DropdownMenuItem
                      key={category.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onMoveToCategory(bookmark, category.id)
                      }}
                    >
                      {category.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
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
