/**
 * useMediaQuery Hook - 响应式断点检测
 * Tailwind 默认断点梯度,补 md 768 平板中间档
 * PC ≥1024px(lg)/ 平板 ≥768px(md)/ 移动端 <768px
 */

import { useEffect, useState } from 'react'

const PC_QUERY = '(min-width: 1024px)'
const TABLET_QUERY = '(min-width: 768px)'
const SM_QUERY = '(min-width: 640px)'

export interface UseMediaQueryReturn {
  isSm: boolean
  isPC: boolean
  isTablet: boolean
  isMobile: boolean
}

export function useMediaQuery(): UseMediaQueryReturn {
  const [isSm, setIsSm] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia(SM_QUERY).matches
  })
  const [isPC, setIsPC] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia(PC_QUERY).matches
  })
  const [isTablet, setIsTablet] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia(TABLET_QUERY).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(SM_QUERY)
    const handler = (e: MediaQueryListEvent) => setIsSm(e.matches)
    setIsSm(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

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

  return { isSm, isPC, isTablet, isMobile: !isTablet }
}
