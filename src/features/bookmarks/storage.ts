import { BOOKMARK_STORAGE_KEY, COLLAPSED_STORAGE_KEY, DEFAULT_BOOKMARKS } from './constants'
import type { Bookmark } from './types'

export const loadBookmarks = (): Bookmark[] => {
  try {
    const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(DEFAULT_BOOKMARKS))
      return [...DEFAULT_BOOKMARKS]
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [...DEFAULT_BOOKMARKS]
  } catch {
    return [...DEFAULT_BOOKMARKS]
  }
}

export const saveBookmarks = (bookmarks: Bookmark[]) => {
  localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks))
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
  localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(collapsed))
}
