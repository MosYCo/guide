/**
 * 状态占位组件
 * FR-003: 加载/空/错误三类状态统一为占位 + 引导动作,配色走语义色阶
 */

import type { ReactNode } from 'react'
import { AlertTriangle, Inbox } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** 加载占位:复用 Skeleton,语义中性 */
export function StateLoading({
  rows = 6,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div
      className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6', className)}
      role="status"
      aria-label="加载中"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  )
}

/** 空状态:文案 + 引导动作按钮 */
export function StateEmpty({
  message,
  action,
  className,
}: {
  message: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 text-center',
        className,
      )}
    >
      <Inbox className="h-10 w-10 text-muted-foreground/50" aria-hidden />
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  )
}

/** 错误状态:原因文本 + 重试按钮,语义色 destructive/warning */
export function StateError({
  message,
  onRetry,
  className,
}: {
  message: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 text-center',
        className,
      )}
      role="alert"
    >
      <AlertTriangle className="h-10 w-10 text-destructive/70" aria-hidden />
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="focus-ring rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
        >
          重试
        </button>
      )}
    </div>
  )
}
