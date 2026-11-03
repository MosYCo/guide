/**
 * Header 组件 - 顶部导航栏
 * 包含主题切换、操作按钮（添加书签、导入导出等）
 * 落地 type scale / elevation / focus ring token
 */

import { Moon, Sun, Plus, Monitor, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ImportExportButtons } from '@/components/bookmark/ImportExportButtons'
import type { ResolvedTheme, Theme } from '@/types'

export interface HeaderProps {
  theme: Theme
  resolvedTheme: ResolvedTheme
  onThemeChange: (theme: Theme) => void
  onAddBookmark: () => void
  onDataChanged: () => Promise<boolean | void> | boolean | void
  onOpenSearch: () => void
}

function ThemeToggle({
  theme,
  resolvedTheme,
  onChange,
}: {
  theme: Theme
  resolvedTheme: ResolvedTheme
  onChange: (t: Theme) => void
}) {
  // 三态循环：light → dark → system → light
  const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const Icon = resolvedTheme === 'dark' ? Moon : Sun
  const label = theme === 'system' ? '跟随系统' : theme === 'dark' ? '暗黑模式' : '亮色模式'
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(next)}
            className="focus-ring min-h-11 min-w-11"
            aria-label={`切换主题（当前：${label}）`}
          >
            {theme === 'system' ? <Monitor className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>主题：{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function Header({
  theme,
  resolvedTheme,
  onThemeChange,
  onAddBookmark,
  onDataChanged,
  onOpenSearch,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b border-border bg-background/95 px-4 shadow-elevation-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        <h1 className="text-h1 font-bold text-primary">🔖 书签导航</h1>
      </div>
      <div className="ml-auto flex items-center gap-1">
        {/* 搜索入口:Header 图标按钮打开命令面板;Ctrl+K 全局快捷键 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSearch}
          className="focus-ring min-h-11 min-w-11"
          aria-label="搜索书签"
          aria-keyshortcuts="Control+K Meta+K"
        >
          <Search className="h-5 w-5" />
        </Button>
        <ImportExportButtons onDataChanged={onDataChanged} />
        <ThemeToggle theme={theme} resolvedTheme={resolvedTheme} onChange={onThemeChange} />
        <Button
          onClick={onAddBookmark}
          size="sm"
          className="focus-ring min-h-11 min-w-11 gap-1 sm:min-h-9 sm:min-w-9"
          aria-label="添加书签"
        >
          <Plus className="h-4 w-4" />
          <span className="text-body hidden sm:inline">添加书签</span>
        </Button>
      </div>
    </header>
  )
}
