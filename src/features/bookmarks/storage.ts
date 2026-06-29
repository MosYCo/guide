import {
  BACKUP_STORAGE_KEY,
  BOOKMARK_STORAGE_KEY,
  BOOKMARK_EXPORT_VERSION,
  CATEGORY_ORDER,
  CATEGORY_STORAGE_KEY,
  COLLAPSED_STORAGE_KEY,
  DEFAULT_BOOKMARKS,
  DELETED_CATEGORIES_STORAGE_KEY,
  UNCATEGORIZED_CATEGORY,
} from './constants'
import type { Bookmark, BookmarkBackup, BookmarkExportData, CategoryMeta } from './types'
import { createBookmarkId, normalizeDockOrder, parseBookmarkUrl } from './utils'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export const sanitizeBookmark = (value: unknown): Bookmark | null => {
  if (!isRecord(value)) return null

  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const url = typeof value.url === 'string' ? parseBookmarkUrl(value.url) : null
  const faviconUrl =
    typeof value.faviconUrl === 'string' && value.faviconUrl.trim() ? parseBookmarkUrl(value.faviconUrl) : ''
  const cat = typeof value.cat === 'string' && value.cat.trim() ? value.cat.trim() : UNCATEGORIZED_CATEGORY

  if (!title || !url || faviconUrl === null) return null

  const bookmark: Bookmark = {
    id: typeof value.id === 'string' && value.id.trim() ? value.id.trim() : createBookmarkId(),
    title,
    url,
    cat,
    icon: typeof value.icon === 'string' ? value.icon.trim().slice(0, 8) : '',
    faviconUrl,
    pin: typeof value.pin === 'boolean' ? value.pin : false,
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean)
      : [],
  }

  if (typeof value.dockOrder === 'number' && Number.isFinite(value.dockOrder)) {
    bookmark.dockOrder = value.dockOrder
  }

  return bookmark
}

export const parseBookmarks = (value: unknown): Bookmark[] => {
  if (!Array.isArray(value)) return []

  const seenIds = new Set<string>()
  const seenUrls = new Set<string>()

  return normalizeDockOrder(
    value.reduce<Bookmark[]>((result, item) => {
      const bookmark = sanitizeBookmark(item)
      if (!bookmark || seenUrls.has(bookmark.url)) return result

      while (seenIds.has(bookmark.id)) {
        bookmark.id = createBookmarkId()
      }

      seenIds.add(bookmark.id)
      seenUrls.add(bookmark.url)
      result.push(bookmark)
      return result
    }, []),
  )
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
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(normalizeDockOrder(bookmarks)))
    return true
  } catch {
    return false
  }
}

export const sanitizeCategoryMeta = (value: unknown): CategoryMeta | null => {
  if (!isRecord(value)) return null

  const name = typeof value.name === 'string' ? value.name.trim() : ''
  if (!name) return null

  return {
    name,
    order: typeof value.order === 'number' && Number.isFinite(value.order) ? value.order : CATEGORY_ORDER[name] ?? 99,
    hidden: typeof value.hidden === 'boolean' ? value.hidden : false,
  }
}

export const parseCategoryMeta = (value: unknown): CategoryMeta[] => {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()

  return value.reduce<CategoryMeta[]>((result, item) => {
    const category = sanitizeCategoryMeta(item)
    if (!category || seen.has(category.name)) return result

    seen.add(category.name)
    result.push(category)
    return result
  }, [])
}

export const loadCategories = (): CategoryMeta[] => {
  try {
    const raw = localStorage.getItem(CATEGORY_STORAGE_KEY)
    return raw ? parseCategoryMeta(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

export const saveCategories = (categories: CategoryMeta[]) => {
  try {
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(parseCategoryMeta(categories)))
    return true
  } catch {
    return false
  }
}

export const parseImportData = (
  value: unknown,
): { bookmarks: Bookmark[]; categories: CategoryMeta[]; backups: BookmarkBackup[] } | null => {
  const legacyBookmarks = parseBookmarks(value)
  if (legacyBookmarks.length) {
    return { bookmarks: legacyBookmarks, categories: [], backups: [] }
  }

  if (!isRecord(value)) return null

  const bookmarks = parseBookmarks(value.bookmarks)
  if (!bookmarks.length) return null

  return {
    bookmarks,
    categories: parseCategoryMeta(value.categories),
    backups: parseBackups(value.backups),
  }
}

export const createExportData = (
  bookmarks: Bookmark[],
  categories: CategoryMeta[],
  backups: BookmarkBackup[] = [],
): BookmarkExportData => {
  return {
    version: BOOKMARK_EXPORT_VERSION,
    bookmarks: normalizeDockOrder(bookmarks),
    categories: parseCategoryMeta(categories),
    backups: parseBackups(backups),
  }
}

export const sanitizeBackup = (value: unknown): BookmarkBackup | null => {
  if (!isRecord(value)) return null

  const id = typeof value.id === 'string' && value.id.trim() ? value.id.trim() : createBookmarkId()
  const createdAt = typeof value.createdAt === 'string' && value.createdAt.trim() ? value.createdAt.trim() : new Date().toISOString()
  const label = typeof value.label === 'string' && value.label.trim() ? value.label.trim() : '备份'
  const bookmarks = parseBookmarks(value.bookmarks)
  const categories = parseCategoryMeta(value.categories)

  if (!bookmarks.length) return null

  return {
    id,
    createdAt,
    label,
    bookmarks,
    categories,
  }
}

export const parseBackups = (value: unknown): BookmarkBackup[] => {
  if (!Array.isArray(value)) return []

  return value.reduce<BookmarkBackup[]>((result, item) => {
    const backup = sanitizeBackup(item)
    if (backup) result.push(backup)
    return result
  }, [])
}

export const loadBackups = (): BookmarkBackup[] => {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY)
    return raw ? parseBackups(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

export const saveBackups = (backups: BookmarkBackup[]) => {
  try {
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(parseBackups(backups)))
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

export const loadDeletedCategories = (): string[] => {
  try {
    const raw = localStorage.getItem(DELETED_CATEGORIES_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((category): category is string => typeof category === 'string') : []
  } catch {
    return []
  }
}

export const saveDeletedCategories = (categories: string[]) => {
  try {
    localStorage.setItem(DELETED_CATEGORIES_STORAGE_KEY, JSON.stringify(categories))
    return true
  } catch {
    return false
  }
}
