import { CATEGORY_ORDER } from './constants'
import type { Bookmark, BookmarkGroup, CategoryMeta, DockMoveDirection } from './types'

export const createBookmarkId = () => {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export const normalizeUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export const parseBookmarkUrl = (value: string) => {
  const normalizedUrl = normalizeUrl(value)
  if (!normalizedUrl) return null

  try {
    const url = new URL(normalizedUrl)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
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

export const sortCategories = (categories: string[] | CategoryMeta[]) => {
  return [...categories]
    .map((category) =>
      typeof category === 'string' ? { name: category, order: CATEGORY_ORDER[category] ?? 99 } : category,
    )
    .sort((categoryA, categoryB) => {
      return categoryA.order === categoryB.order
        ? categoryA.name.localeCompare(categoryB.name)
        : categoryA.order - categoryB.order
    })
}

export const getPinnedBookmarks = (bookmarks: Bookmark[]) => {
  return bookmarks
    .filter((bookmark) => bookmark.pin)
    .map((bookmark, index) => ({ bookmark, index }))
    .sort((a, b) => {
      const orderA = a.bookmark.dockOrder ?? a.index
      const orderB = b.bookmark.dockOrder ?? b.index
      return orderA === orderB ? a.index - b.index : orderA - orderB
    })
    .map(({ bookmark }) => bookmark)
}

export const normalizeDockOrder = (bookmarks: Bookmark[]): Bookmark[] => {
  const orderById = new Map(getPinnedBookmarks(bookmarks).map((bookmark, index) => [bookmark.id, index]))

  return bookmarks.map((bookmark) => {
    if (!bookmark.pin) {
      return {
        id: bookmark.id,
        title: bookmark.title,
        url: bookmark.url,
        cat: bookmark.cat,
        icon: bookmark.icon,
        faviconUrl: bookmark.faviconUrl,
        pin: false,
        tags: bookmark.tags,
      }
    }

    return { ...bookmark, dockOrder: orderById.get(bookmark.id) ?? 0 }
  })
}

export const movePinnedBookmark = (bookmarks: Bookmark[], id: string, direction: DockMoveDirection): Bookmark[] => {
  const pinned = getPinnedBookmarks(bookmarks)
  const index = pinned.findIndex((bookmark) => bookmark.id === id)
  const targetIndex = direction === 'left' ? index - 1 : index + 1

  if (index === -1 || targetIndex < 0 || targetIndex >= pinned.length) {
    return bookmarks
  }

  const nextPinned = [...pinned]
  const [bookmark] = nextPinned.splice(index, 1)
  nextPinned.splice(targetIndex, 0, bookmark)

  const orderById = new Map(nextPinned.map((item, order) => [item.id, order]))
  return bookmarks.map((item) => (orderById.has(item.id) ? { ...item, dockOrder: orderById.get(item.id) } : item))
}
