/**
 * Toast 通知系统
 * FR-010: 操作反馈(成功/警告/信息/错误),统一位置/时序/语义色
 * T008: 补 success/warning/info/destructive 语义色变体,走 tokens.css 语义色阶
 */

import {
  createContext,
  useCallback,
  useContext,
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
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// 语义色映射:每类 toast 的边框/背景/文本 + 图标
const TOAST_STYLES: Record<
  ToastType,
  { wrapper: string; icon: ReactNode }
> = {
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
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const remove = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* FR-010 统一位置:右下角;时序:3s 自动消失 */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.type]
          return (
            <div
              key={t.id}
              role="alert"
              className={cn(
                'flex items-center gap-2 rounded-md border p-3 text-sm shadow-elevation-md',
                style.wrapper,
              )}
            >
              {style.icon}
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => remove(t.id)}
                aria-label="关闭通知"
                className="focus-ring shrink-0 rounded opacity-70 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
