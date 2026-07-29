/**
 * useMediaQuery Hook - 响应式断点检测
 * FR-011: Tailwind 默认断点梯度,补 md 768 平板中间档
 *   PC ≥1024px(lg)/ 平板 ≥768px(md)/ 移动端 <768px
 * @see specs/001-ui-ux-overhaul/contracts/ui-contract.md §9
 */

import { useEffect, useState } from 'react'

const PC_QUERY = '(min-width: 1024px)'
const TABLET_QUERY = '(min-width: 768px)'

export interface UseMediaQueryReturn {
  isPC: boolean
  isTablet: boolean
  isMobile: boolean
}

export function useMediaQuery(): UseMediaQueryReturn {
  const [isPC, setIsPC] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia(PC_QUERY).matches
  })
  const [isTablet, setIsTablet] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia(TABLET_QUERY).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(PC_QUERY)
    const handler = (e: MediaQueryListEvent) => setIsPC(e.matches)
    setIsPC(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const mql = window.matchMedia(TABLET_QUERY)
    const handler = (e: MediaQueryListEvent) => setIsTablet(e.matches)
    setIsTablet(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return { isPC, isTablet, isMobile: !isTablet }
}
