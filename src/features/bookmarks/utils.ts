import { CATEGORY_ORDER } from './constants'
import type { Bookmark, BookmarkGroup } from './types'

export const createBookmarkId = () => {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export const normalizeUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export const getHostname = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export const getFaviconUrl = (url: string, size = 64) => {
  return `https://www.google.com/s2/favicons?sz=${size}&domain=${encodeURIComponent(getHostname(url))}`
}

export const groupBookmarks = (bookmarks: Bookmark[]): BookmarkGroup[] => {
  const groups = bookmarks.reduce<Record<string, Bookmark[]>>((result, bookmark) => {
    const category = bookmark.cat || '未分类'
    result[category] = result[category] ?? []
    result[category].push(bookmark)
    return result
  }, {})

  return Object.keys(groups)
    .sort((a, b) => (CATEGORY_ORDER[a] ?? 99) - (CATEGORY_ORDER[b] ?? 99))
    .map((name) => ({ name, items: groups[name] }))
}
