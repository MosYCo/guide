import {
  BACKUP_STORAGE_KEY,
  BOOKMARK_STORAGE_KEY,
  BOOKMARK_EXPORT_VERSION,
  CATEGORY_ORDER,
  CATEGORY_STORAGE_KEY,
  COLLAPSED_STORAGE_KEY,
  DEFAULT_BOOKMARKS,
  DELETED_CATEGORIES_STORAGE_KEY,
  LOCAL_STORAGE_SOFT_LIMIT_BYTES,
  SETTINGS_STORAGE_KEY,
  UNCATEGORIZED_CATEGORY,
  UNDO_STORAGE_KEY,
} from './constants'
import type {
  Bookmark,
  BookmarkBackup,
  BookmarkExportData,
  BookmarkIconMode,
  BookmarkSettings,
  CategoryMeta,
  StorageUsage,
} from './types'
import { createBookmarkId, normalizeDockOrder, parseBookmarkUrl } from './utils'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const DEFAULT_SETTINGS: BookmarkSettings = {
  iconMode: 'text',
}

export const sanitizeBookmark = (value: unknown): Bookmark | null => {
  if (!isRecord(value)) return null

  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const url = typeof value.url === 'string' ? parseBookmarkUrl(value.url) : null
  const faviconUrl =
    typeof value.faviconUrl === 'string' && value.faviconUrl.trim()
      ? parseBookmarkUrl(value.faviconUrl)
      : ''
  const cat =
    typeof value.cat === 'string' && value.cat.trim() ? value.cat.trim() : UNCATEGORIZED_CATEGORY

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
      ? value.tags
          .filter((tag): tag is string => typeof tag === 'string')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [],
    visits:
      typeof value.visits === 'number' && Number.isFinite(value.visits) && value.visits > 0
        ? Math.floor(value.visits)
        : 0,
  }

  if (typeof value.dockOrder === 'number' && Number.isFinite(value.dockOrder)) {
    bookmark.dockOrder = value.dockOrder
  }

  if (typeof value.lastVisitedAt === 'string' && value.lastVisitedAt.trim()) {
    const visitedAt = new Date(value.lastVisitedAt)
    if (!Number.isNaN(visitedAt.getTime())) {
      bookmark.lastVisitedAt = visitedAt.toISOString()
    }
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
    order:
      typeof value.order === 'number' && Number.isFinite(value.order)
        ? value.order
        : (CATEGORY_ORDER[name] ?? 99),
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
): {
  bookmarks: Bookmark[]
  categories: CategoryMeta[]
  backups: BookmarkBackup[]
  settings: BookmarkSettings | null
} | null => {
  const legacyBookmarks = parseBookmarks(value)
  if (legacyBookmarks.length) {
    return { bookmarks: legacyBookmarks, categories: [], backups: [], settings: null }
  }

  if (!isRecord(value)) return null

  const bookmarks = parseBookmarks(value.bookmarks)
  if (!bookmarks.length) return null

  return {
    bookmarks,
    categories: parseCategoryMeta(value.categories),
    backups: parseBackups(value.backups),
    settings: sanitizeSettings(value.settings),
  }
}

const getFolderTrail = (element: Element) => {
  const trail: string[] = []
  let current = element.parentElement

  while (current) {
    if (current.tagName.toLowerCase() === 'dl') {
      const heading = current.previousElementSibling
      if (heading?.tagName.toLowerCase() === 'h3') {
        const text = heading.textContent?.trim()
        if (text) trail.unshift(text)
      }
    }
    current = current.parentElement
  }

  return trail
}

const getBookmarkHtmlCategory = (anchor: Element) => {
  const trail = getFolderTrail(anchor)
  return trail[trail.length - 1] ?? UNCATEGORIZED_CATEGORY
}

const getBookmarkHtmlTags = (anchor: Element) => {
  const tags = anchor.getAttribute('tags') ?? ''
  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export const parseBookmarkHtml = (html: string): Bookmark[] => {
  try {
    const document = new DOMParser().parseFromString(html, 'text/html')
    const anchors = [...document.querySelectorAll('a[href]')]

    return parseBookmarks(
      anchors.map((anchor) => ({
        id: createBookmarkId(),
        title: anchor.textContent?.trim() ?? '',
        url: anchor.getAttribute('href') ?? '',
        cat: getBookmarkHtmlCategory(anchor),
        icon: '',
        faviconUrl: anchor.getAttribute('icon_uri') ?? anchor.getAttribute('icon') ?? '',
        pin: false,
        tags: getBookmarkHtmlTags(anchor),
      })),
    )
  } catch {
    return []
  }
}

const escapeBookmarkHtml = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const createBookmarkHtml = (bookmarks: Bookmark[]) => {
  const groups = bookmarks.reduce<Record<string, Bookmark[]>>((result, bookmark) => {
    const category = bookmark.cat || UNCATEGORIZED_CATEGORY
    result[category] = result[category] ?? []
    result[category].push(bookmark)
    return result
  }, {})

  const folderHtml = Object.entries(groups)
    .map(([category, items]) => {
      const links = items
        .map((bookmark) => {
          const tags = bookmark.tags?.length
            ? ` TAGS="${escapeBookmarkHtml(bookmark.tags.join(','))}"`
            : ''
          const icon = bookmark.faviconUrl
            ? ` ICON_URI="${escapeBookmarkHtml(bookmark.faviconUrl)}"`
            : ''
          return `        <DT><A HREF="${escapeBookmarkHtml(bookmark.url)}"${icon}${tags}>${escapeBookmarkHtml(bookmark.title)}</A>`
        })
        .join('\n')

      return `    <DT><H3>${escapeBookmarkHtml(category)}</H3>\n    <DL><p>\n${links}\n    </DL><p>`
    })
    .join('\n')

  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${folderHtml}
</DL><p>
`
}

export const createExportData = (
  bookmarks: Bookmark[],
  categories: CategoryMeta[],
  backups: BookmarkBackup[] = [],
  settings: BookmarkSettings = DEFAULT_SETTINGS,
): BookmarkExportData => {
  return {
    version: BOOKMARK_EXPORT_VERSION,
    bookmarks: normalizeDockOrder(bookmarks),
    categories: parseCategoryMeta(categories),
    backups: parseBackups(backups),
    settings: sanitizeSettings(settings),
  }
}

const iconModes: BookmarkIconMode[] = ['google', 'direct', 'text']

export const sanitizeSettings = (value: unknown): BookmarkSettings => {
  if (!isRecord(value)) return { ...DEFAULT_SETTINGS }

  return {
    iconMode: iconModes.includes(value.iconMode as BookmarkIconMode)
      ? (value.iconMode as BookmarkIconMode)
      : DEFAULT_SETTINGS.iconMode,
  }
}

export const loadSettings = (): BookmarkSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    return raw ? sanitizeSettings(JSON.parse(raw)) : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export const saveSettings = (settings: BookmarkSettings) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitizeSettings(settings)))
    return true
  } catch {
    return false
  }
}

export const sanitizeBackup = (value: unknown): BookmarkBackup | null => {
  if (!isRecord(value)) return null

  const id = typeof value.id === 'string' && value.id.trim() ? value.id.trim() : createBookmarkId()
  const createdAt =
    typeof value.createdAt === 'string' && value.createdAt.trim()
      ? value.createdAt.trim()
      : new Date().toISOString()
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

export const loadUndoSnapshots = (): BookmarkBackup[] => {
  try {
    const raw = localStorage.getItem(UNDO_STORAGE_KEY)
    return raw ? parseBackups(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

export const saveUndoSnapshots = (snapshots: BookmarkBackup[]) => {
  try {
    localStorage.setItem(UNDO_STORAGE_KEY, JSON.stringify(parseBackups(snapshots)))
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
    return Array.isArray(parsed)
      ? parsed.filter((category): category is string => typeof category === 'string')
      : []
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

const getStringBytes = (value: string) => new Blob([value]).size

export const getStorageUsage = (): StorageUsage => {
  try {
    const usedBytes = [
      BOOKMARK_STORAGE_KEY,
      CATEGORY_STORAGE_KEY,
      DELETED_CATEGORIES_STORAGE_KEY,
      BACKUP_STORAGE_KEY,
      UNDO_STORAGE_KEY,
      COLLAPSED_STORAGE_KEY,
      SETTINGS_STORAGE_KEY,
      'guide_search_history',
    ].reduce((total, key) => {
      const value = localStorage.getItem(key)
      return total + getStringBytes(key) + (value ? getStringBytes(value) : 0)
    }, 0)

    return {
      usedBytes,
      quotaBytes: LOCAL_STORAGE_SOFT_LIMIT_BYTES,
      percent: Math.min(100, Math.round((usedBytes / LOCAL_STORAGE_SOFT_LIMIT_BYTES) * 100)),
    }
  } catch {
    return {
      usedBytes: 0,
      quotaBytes: LOCAL_STORAGE_SOFT_LIMIT_BYTES,
      percent: 0,
    }
  }
}
