/**
 * 书签搜索过滤纯函数
 * 按名称、URL 与 Unicode 域名搜索
 * - NFKC:全角/半角统一
 * - NFKD + 去重音:cafe 可匹配 Café
 * - 空白拆 token 做 AND:git hub 匹配 GitHub
 * @see docs/ui-contract.md
 */

import type { Bookmark } from '@/types'
import { displayDomain } from '@/utils/url'

export interface SearchBookmarksOptions {
  limit?: number
}

function fold(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase()
}

/**
 * 按名称、URL、Unicode 域名匹配书签。
 * 空查询返回全部(可选 limit);多 token 需全部命中。
 */
export function searchBookmarks(
  bookmarks: Bookmark[],
  query: string,
  options: SearchBookmarksOptions = {},
): Bookmark[] {
  const tokens = fold(query).trim().split(/\s+/).filter(Boolean)
  const matched =
    tokens.length === 0
      ? bookmarks
      : bookmarks.filter((bookmark) => {
          const name = fold(bookmark.name)
          const url = fold(bookmark.url)
          const domain = fold(displayDomain(bookmark.url))
          return tokens.every(
            (token) => name.includes(token) || url.includes(token) || domain.includes(token),
          )
        })
  return options.limit === undefined ? matched : matched.slice(0, options.limit)
}
