import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useTheme } from '@/hooks/useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('默认跟随系统并可持久化切换', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('system')

    act(() => result.current.setTheme('dark'))
    expect(result.current.theme).toBe('dark')
    expect(result.current.resolvedTheme).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('bookmark-theme')).toBe('dark')

    act(() => result.current.setTheme('light'))
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
