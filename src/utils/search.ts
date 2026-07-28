/**
 * 书签搜索过滤纯函数
 * FR-012: 按名称和 URL 实时搜索（不区分大小写）
 * @see specs/001-bookmark-navigation/research.md §查询模式 2
 */

import type { Bookmark } from '@/types'

/**
 * 按名称和 URL 模糊匹配过滤书签（不区分大小写）。
 * 空查询返回全部。
 * @param bookmarks 待过滤书签列表
 * @param query 搜索关键词
 */
export function filterBookmarks(bookmarks: Bookmark[], query: string): Bookmark[] {
  const q = query.trim().toLowerCase()
  if (!q) return bookmarks
  return bookmarks.filter(
    (b) =>
      b.name.toLowerCase().includes(q) || b.url.toLowerCase().includes(q),
  )
}
