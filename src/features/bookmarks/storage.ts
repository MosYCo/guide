import { BOOKMARK_STORAGE_KEY, COLLAPSED_STORAGE_KEY, DEFAULT_BOOKMARKS } from './constants'
import type { Bookmark } from './types'
import { createBookmarkId, parseBookmarkUrl } from './utils'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export const sanitizeBookmark = (value: unknown): Bookmark | null => {
  if (!isRecord(value)) return null

  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const url = typeof value.url === 'string' ? parseBookmarkUrl(value.url) : null
  const cat = typeof value.cat === 'string' && value.cat.trim() ? value.cat.trim() : '未分类'

  if (!title || !url) return null

  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id.trim() : createBookmarkId(),
    title,
    url,
    cat,
    icon: typeof value.icon === 'string' ? value.icon.trim().slice(0, 8) : '',
    pin: typeof value.pin === 'boolean' ? value.pin : false,
  }
}

export const parseBookmarks = (value: unknown): Bookmark[] => {
  if (!Array.isArray(value)) return []

  const seenIds = new Set<string>()
  const seenUrls = new Set<string>()

  return value.reduce<Bookmark[]>((result, item) => {
    const bookmark = sanitizeBookmark(item)
    if (!bookmark || seenUrls.has(bookmark.url)) return result

    while (seenIds.has(bookmark.id)) {
      bookmark.id = createBookmarkId()
    }

    seenIds.add(bookmark.id)
    seenUrls.add(bookmark.url)
    result.push(bookmark)
    return result
  }, [])
}

const getDefaultBookmarks = () => parseBookmarks(DEFAULT_BOOKMARKS)

export const loadBookmarks = (): Bookmark[] => {
  try {
    const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY)
    if (!raw) {
      const defaults = getDefaultBookmarks()
      saveBookmarks(defaults)
      return defaults
    }

    const parsed = JSON.parse(raw)
    const bookmarks = parseBookmarks(parsed)
    if (!bookmarks.length) return getDefaultBookmarks()

    saveBookmarks(bookmarks)
    return bookmarks
  } catch {
    return getDefaultBookmarks()
  }
}

export const saveBookmarks = (bookmarks: Bookmark[]) => {
  try {
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks))
    return true
  } catch {
    return false
  }
}

export const loadCollapsedCategories = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export const saveCollapsedCategories = (collapsed: Record<string, boolean>) => {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(collapsed))
    return true
  } catch {
    return false
  }
}
