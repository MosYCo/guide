/**
 * AppLayout 组件 - 响应式布局容器
 * PC(≥lg 1024): 左侧 CategoryNav + 右侧内容区
 * 平板(md 768–1023): 同 PC 但侧栏收窄 + 内容区留白调整
 * 移动端(<md 768): 顶部 Header + 底部 Tab(由 CategoryNav 渲染) + 内容区
 * T019: 补 md 768 平板中间档;横竖屏靠宽度驱动,不监听 orientation(FR-011)
 * 折叠态:aside 宽度随 collapsed 收窄(状态由 App 上提,AppLayout 受控)
 */

import type { ReactNode } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

export interface AppLayoutProps {
  header: ReactNode
  categoryNav: ReactNode
  children: ReactNode
  /** PC 侧栏是否折叠(收起为图标列) */
  collapsed?: boolean
}

function SkipLink() {
  return (
    <a
      href="#main-content"
      className="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-body focus:shadow-elevation-lg"
    >
      跳到主要内容
    </a>
  )
}

export function AppLayout({ header, categoryNav, children, collapsed }: AppLayoutProps) {
  const { isPC, isTablet } = useMediaQuery()

  // PC 与平板共用侧栏布局,宽度据折叠态切换
  if (isPC || isTablet) {
    return (
      <div className="flex min-h-screen flex-col">
        <SkipLink />
        {header}
        <div className="flex flex-1 overflow-hidden">
          <aside
            className={cn(
              'shrink-0 border-r border-border bg-card/50 transition-[width] duration-200',
              // 折叠态收窄为图标列宽度;展开态平板/PC 差异
              collapsed ? 'w-16' : isTablet ? 'w-52' : 'w-60',
            )}
          >
            {categoryNav}
          </aside>
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto p-4 outline-none">
            {children}
          </main>
        </div>
      </div>
    )
  }

  // 移动端:顶部 Header + 内容区 + 底部 Tab(由 CategoryNav 渲染)
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      {header}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 overflow-auto p-3 pb-[calc(5rem+env(safe-area-inset-bottom))] outline-none"
      >
        {children}
      </main>
      {/* 底部固定 Tab 由 CategoryNav 渲染(FR-014) */}
      {categoryNav}
    </div>
  )
}
