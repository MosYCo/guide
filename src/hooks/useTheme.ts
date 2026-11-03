/**
 * useTheme Hook - 暗黑模式管理
 * FR-017: 挂载时不重复 apply(由 index.html 内联脚本前置设 .dark,防 FOUC);
 *         用户切换主题时仍由 hook 调 applyTheme 设 class(运行时切换生效)。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ResolvedTheme, Theme } from '@/types'
import { getStoredTheme, setStoredTheme } from '@/utils/storage'

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement
  if (resolved === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#1a1a1a' : '#ffffff')
  }
}

export interface UseThemeReturn {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme() ?? 'system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    theme === 'system' ? getSystemTheme() : theme,
  )

  // T006: 挂载时跳过 applyTheme(内联脚本已前置设 class,防 FOUC);
  // 仅同步 resolvedTheme 状态。后续 theme 变化(用户切换)才 apply。
  const mountedRef = useRef(false)
  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme
    setResolvedTheme(resolved)
    if (mountedRef.current) {
      applyTheme(resolved)
    } else {
      // 内联脚本已设 class;首挂载仍需同步浏览器 theme-color
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) {
        meta.setAttribute('content', resolved === 'dark' ? '#1a1a1a' : '#ffffff')
      }
    }
    mountedRef.current = true
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const next = getSystemTheme()
      setResolvedTheme(next)
      applyTheme(next)
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    setStoredTheme(next)
  }, [])

  return { theme, resolvedTheme, setTheme }
}
