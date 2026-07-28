/**
 * useSearch Hook - 实时搜索
 * FR-012: 按名称和 URL 实时过滤（输入即过滤）
 * @see specs/001-bookmark-navigation/contracts/ui-contract.md §BookmarkSearch
 */

import { useMemo, useState } from 'react'
import type { Bookmark } from '@/types'
import { filterBookmarks } from '@/utils/search'

export interface UseSearchReturn {
  query: string
  setQuery: (q: string) => void
  results: Bookmark[]
  hasQuery: boolean
}

/**
 * 实时搜索 Hook。
 * @param source 待搜索的书签源列表
 */
export function useSearch(source: Bookmark[]): UseSearchReturn {
  const [query, setQuery] = useState('')
  const results = useMemo(
    () => filterBookmarks(source, query),
    [source, query],
  )
  const hasQuery = query.trim().length > 0
  return { query, setQuery, results, hasQuery }
}
