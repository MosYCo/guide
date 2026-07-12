import { DEFAULT_BOOKMARKS, UNCATEGORIZED_CATEGORY } from '../../constants'
import { parseBookmarks } from '../../storage'
import type { Bookmark, BookmarkActionResult, BulkOperationResult } from '../../types'
import { createDefaultCategories, type BookmarkStore } from './store'

export const createMutationActions = (store: BookmarkStore) => {
  const { bookmarks, categoriesMeta, commit, persist, upsertCategory, getNextDockOrder } = store

  const removeBookmark = (id: string) => {
    return commit(
      '删除书签',
      () => {
        bookmarks.value = bookmarks.value.filter((bookmark) => bookmark.id !== id)
      },
      { backup: true },
    )
  }

  const bulkMoveCategory = (
    ids: string[],
    category: string,
  ): BulkOperationResult | { ok: false; reason: string } => {
    const uniqueIds = new Set(ids)
    const normalizedCategory = category.trim() || UNCATEGORIZED_CATEGORY

    const result = commit(
      '批量移动分类',
      () => {
        upsertCategory(normalizedCategory)
        bookmarks.value = bookmarks.value.map((bookmark) =>
          uniqueIds.has(bookmark.id) ? { ...bookmark, cat: normalizedCategory } : bookmark,
        )
      },
      { backup: true },
    )

    return result.ok ? { ok: true, count: uniqueIds.size } : result
  }

  const bulkSetPinned = (
    ids: string[],
    pin: boolean,
  ): BulkOperationResult | { ok: false; reason: string } => {
    const uniqueIds = new Set(ids)

    const result = commit(
      pin ? '批量固定到 Dock' : '批量取消 Dock',
      () => {
        bookmarks.value = bookmarks.value.map((bookmark) => {
          if (!uniqueIds.has(bookmark.id)) return bookmark
          return {
            ...bookmark,
            pin,
            dockOrder: pin ? (bookmark.dockOrder ?? getNextDockOrder()) : undefined,
          }
        })
      },
      { backup: true },
    )

    return result.ok ? { ok: true, count: uniqueIds.size } : result
  }

  const bulkDelete = (ids: string[]): BulkOperationResult | { ok: false; reason: string } => {
    const uniqueIds = new Set(ids)

    const result = commit(
      '批量删除书签',
      () => {
        bookmarks.value = bookmarks.value.filter((bookmark) => !uniqueIds.has(bookmark.id))
      },
      { backup: true },
    )

    return result.ok ? { ok: true, count: uniqueIds.size } : result
  }

  const recordBookmarkVisit = (id: string): BookmarkActionResult => {
    if (!bookmarks.value.some((bookmark) => bookmark.id === id)) {
      return { ok: false, reason: '未找到书签' }
    }

    let visitedBookmark: Bookmark | undefined
    const result = commit(
      '记录访问',
      () => {
        bookmarks.value = bookmarks.value.map((bookmark) =>
          bookmark.id === id
            ? (visitedBookmark = {
                ...bookmark,
                visits: (bookmark.visits ?? 0) + 1,
                lastVisitedAt: new Date().toISOString(),
              })
            : bookmark,
        )
      },
      { undo: false, failReason: '访问统计保存失败：浏览器存储空间不足或不可用' },
    )

    if (!result.ok) return result
    if (!visitedBookmark) return { ok: false, reason: '未找到书签' }
    return { ok: true, bookmark: visitedBookmark }
  }

  const resetBookmarks = () => {
    bookmarks.value = parseBookmarks(DEFAULT_BOOKMARKS)
    categoriesMeta.value = createDefaultCategories()
    persist()
  }

  return {
    removeBookmark,
    bulkMoveCategory,
    bulkSetPinned,
    bulkDelete,
    recordBookmarkVisit,
    resetBookmarks,
  }
}
