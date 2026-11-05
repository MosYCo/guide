/**
 * BookmarkCard 组件 - 单个书签卡片
 * 图标降级、点击新标签页打开
 */

import { useEffect, useRef, useState } from 'react'
import {
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  FolderInput,
  Pin,
  PinOff,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
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
  onTogglePin?: (bookmark: Bookmark) => void
  /** 可选：主列表内前移/后移（键盘与触屏等价路径） */
  onMoveEarlier?: () => void
  onMoveLater?: () => void
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
  onTogglePin,
  onMoveEarlier,
  onMoveLater,
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
  const [iconLoaded, setIconLoaded] = useState(false)

  // 编辑保存后同一个卡片实例会复用,图标 state 必须跟随 bookmark 更新
  useEffect(() => {
    setIconSrc(bookmark.icon || resolveIcon(bookmark.url, bookmark.name))
    setIconFailedOnce(false)
    setIconLoaded(false)
  }, [bookmark.icon, bookmark.url, bookmark.name])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const suppressMenuFocusRef = useRef(false)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const domain = displayDomain(bookmark.url)
  let address = domain || '无效地址'
  if (domain) {
    try {
      const path = new URL(bookmark.url).pathname
      if (path !== '/') address += path
    } catch {
      // 旧数据可能含无效 URL;仍展示可识别的域名。
    }
  }

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
    <div
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
      title={bookmark.url}
      className={cn(
        'group relative flex h-[4.75rem] min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-border/80 bg-card px-3 pr-12 transition-[background-color,border-color,box-shadow]',
        'hover:border-primary/40 hover:bg-accent/60 hover:shadow-elevation-sm focus-visible:bg-accent/60',
        'focus-ring',
        className,
      )}
    >
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md">
        {/* 本地首字母图标先显示:远程 favicon 挂起/被墙时也不会留下空白图标位 */}
        <img
          src={fallbackIcon(bookmark.name)}
          alt=""
          aria-hidden
          className={cn(
            'absolute inset-0 h-8 w-8 transition-opacity',
            iconLoaded ? 'opacity-0' : 'opacity-100',
          )}
        />
        {/* favicon 原生懒加载 + 解码异步 + onError 二次降级
         * 降级链:favicon 失败 → 首字母图标(getLetterIcon via fallbackIcon)→ 首字母也失败 → 纯色块(getPlaceholderIcon) */}
        <img
          src={iconSrc}
          alt=""
          data-testid="bookmark-icon"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="relative h-8 w-8"
          onLoad={() => setIconLoaded(true)}
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
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <p
          className="text-body line-clamp-1 w-full font-semibold text-foreground"
          title={bookmark.name}
        >
          {bookmark.name}
        </p>
        <p className="text-caption truncate text-muted-foreground" title={bookmark.url}>
          {address}
        </p>
      </div>
      <div className="bookmark-actions absolute right-2 top-1/2 z-10 -translate-y-1/2 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={menuTriggerRef}
              variant="ghost"
              size="icon"
              className="focus-ring relative h-8 w-8 before:absolute before:-inset-1.5 before:content-['']"
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
                suppressMenuFocusRef.current = true
                // 等菜单关闭并释放滚动锁后再开编辑框，避免 Radix 弹层锁叠加
                setTimeout(() => onEdit(bookmark), 0)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              编辑
            </DropdownMenuItem>
            {onMoveEarlier && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveEarlier()
                }}
              >
                <ArrowUp className="mr-2 h-4 w-4" aria-hidden="true" />
                前移
              </DropdownMenuItem>
            )}
            {onMoveLater && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveLater()
                }}
              >
                <ArrowDown className="mr-2 h-4 w-4" aria-hidden="true" />
                后移
              </DropdownMenuItem>
            )}
            {onTogglePin && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onTogglePin(bookmark)
                }}
              >
                {bookmark.pinnedAt ? (
                  <PinOff className="mr-2 h-4 w-4" aria-hidden="true" />
                ) : (
                  <Pin className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {bookmark.pinnedAt ? '取消置顶' : '置顶'}
              </DropdownMenuItem>
            )}
            {categories && onMoveToCategory && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderInput className="mr-2 h-4 w-4" aria-hidden="true" />
                  移动到分类
                </DropdownMenuSubTrigger>
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
    </div>
  )
}
