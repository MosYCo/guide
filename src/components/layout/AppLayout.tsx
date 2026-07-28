/**
 * AppLayout 组件 - 响应式布局容器
 * PC: 左侧 CategoryNav(240px) + 右侧内容区
 * 移动端: 顶部 Header + 顶部 CategoryNav(标签栏) + 内容区
 * @see specs/001-bookmark-navigation/contracts/ui-contract.md §AppLayout
 */

import type { ReactNode } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

export interface AppLayoutProps {
  header: ReactNode
  categoryNav: ReactNode
  children: ReactNode
}

export function AppLayout({ header, categoryNav, children }: AppLayoutProps) {
  const { isPC } = useMediaQuery()

  if (isPC) {
    return (
      <div className="flex min-h-screen flex-col">
        {header}
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-60 shrink-0 border-r border-border bg-card/50">
            {categoryNav}
          </aside>
          <main className="flex-1 overflow-auto p-4">{children}</main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {header}
      <nav className={cn('border-b border-border bg-card/50 px-2 py-2')}>
        {categoryNav}
      </nav>
      <main className="flex-1 overflow-auto p-3 pb-20">{children}</main>
    </div>
  )
}
