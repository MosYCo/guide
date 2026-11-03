/**
 * Toast 通知系统
 * 操作反馈(成功/警告/信息/错误),统一位置/时序/语义色
 * 补 success/warning/info/destructive 语义色变体,走 tokens.css 语义色阶
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'warning' | 'info' | 'error'

interface ToastItem {
  id: number
  type: ToastType
  message: string
  /** 0 表示不自动消失(错误/警告) */
  duration: number
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// 语义色映射:每类 toast 的边框/背景/文本 + 图标
const TOAST_STYLES: Record<ToastType, { wrapper: string; icon: ReactNode }> = {
  success: {
    wrapper: 'border-success/50 bg-success/10 text-success',
    icon: <CheckCircle className="h-4 w-4 shrink-0" />,
  },
  warning: {
    wrapper: 'border-warning/50 bg-warning/10 text-warning',
    icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
  },
  info: {
    wrapper: 'border-info/50 bg-info/10 text-info',
    icon: <Info className="h-4 w-4 shrink-0" />,
  },
  error: {
    wrapper: 'border-destructive/50 bg-destructive/10 text-destructive',
    icon: <AlertCircle className="h-4 w-4 shrink-0" />,
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random()
    // 错误/警告不自动消失,由用户确认;其余 4s 后消失(hover/focus 暂停)
    const duration = type === 'error' || type === 'warning' ? 0 : 4000
    setToasts((prev) => [...prev, { id, type, message, duration }])
  }, [])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* 统一位置:桌面右下角,移动端避开底部 Tab */}
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[100] flex flex-col items-end gap-2 sm:bottom-4 sm:left-auto sm:right-4">
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onClose={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: (id: number) => void }) {
  const remainingRef = useRef(item.duration)
  const [paused, setPaused] = useState(false)
  const style = TOAST_STYLES[item.type]
  const isAlert = item.type === 'error' || item.type === 'warning'

  useEffect(() => {
    if (item.duration === 0 || paused) return
    const started = Date.now()
    const timer = window.setTimeout(() => onClose(item.id), remainingRef.current)
    return () => {
      window.clearTimeout(timer)
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - started))
    }
  }, [item.duration, item.id, onClose, paused])

  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
      aria-atomic="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={cn(
        'flex w-full items-center gap-2 rounded-md border p-3 text-sm shadow-elevation-md sm:w-auto sm:max-w-sm',
        style.wrapper,
      )}
    >
      {style.icon}
      <span className="flex-1">{item.message}</span>
      <button
        onClick={() => onClose(item.id)}
        aria-label="关闭通知"
        className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded opacity-70 hover:opacity-100 sm:h-6 sm:w-6"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
