/**
 * BookmarkSearch 组件 - 搜索框
 * FR-012 实时过滤、FR-013 Ctrl+K 聚焦
 * @see specs/001-bookmark-navigation/contracts/ui-contract.md §BookmarkSearch
 */

import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface BookmarkSearchProps {
  query: string
  onQueryChange: (q: string) => void
  placeholder?: string
  /** 是否显示在命令面板模式（全屏搜索） */
  commandMode?: boolean
  onClose?: () => void
}

export function BookmarkSearch({
  query,
  onQueryChange,
  placeholder = '搜索书签（Ctrl+K）',
  commandMode = false,
  onClose,
}: BookmarkSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Ctrl+K 聚焦搜索框（命令面板模式下也用于打开）
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        if (query) {
          onQueryChange('')
        } else if (commandMode && onClose) {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [query, onQueryChange, commandMode, onClose])

  // 命令面板模式打开时自动聚焦
  useEffect(() => {
    if (commandMode) inputRef.current?.focus()
  }, [commandMode])

  return (
    <div className={cn('relative', commandMode && 'w-full max-w-lg')}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className={cn('pl-9', query && 'pr-9')}
        aria-label="搜索书签"
      />
      {query && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
          onClick={() => onQueryChange('')}
          aria-label="清除搜索"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
