/**
 * useMediaQuery Hook - 响应式断点检测
 * @see specs/001-bookmark-navigation/contracts/ui-contract.md §useMediaQuery
 * PC ≥1024px / 移动端 <1024px
 */

import { useEffect, useState } from 'react'

const PC_QUERY = '(min-width: 1024px)'

export interface UseMediaQueryReturn {
  isPC: boolean
  isMobile: boolean
}

export function useMediaQuery(): UseMediaQueryReturn {
  const [isPC, setIsPC] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia(PC_QUERY).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(PC_QUERY)
    const handler = (e: MediaQueryListEvent) => setIsPC(e.matches)
    setIsPC(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return { isPC, isMobile: !isPC }
}
