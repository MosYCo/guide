import type { Bookmark, BookmarkActionResult, DockDropPlacement, DockMoveDirection } from '../../types'
import { getPinnedBookmarks, movePinnedBookmark, normalizeDockOrder } from '../../utils'
import type { BookmarkStore } from './store'

export const createDockActions = (store: BookmarkStore) => {
  const { bookmarks, commit, getNextDockOrder } = store

  const unpinBookmark = (id: string): BookmarkActionResult => {
    if (!bookmarks.value.some((bookmark) => bookmark.id === id)) {
      return { ok: false, reason: '未找到要移除的书签' }
    }

    let updatedBookmark: Bookmark | undefined

    const result = commit('取消 Dock 固定', () => {
      bookmarks.value = bookmarks.value.map((bookmark) =>
        bookmark.id === id
          ? (updatedBookmark = { ...bookmark, pin: false, dockOrder: undefined })
          : bookmark,
      )
    })

    if (!updatedBookmark) return { ok: false, reason: '未找到要移除的书签' }
    if (!result.ok) return result

    return { ok: true, bookmark: updatedBookmark }
  }

  const toggleBookmarkPin = (id: string): BookmarkActionResult => {
    if (!bookmarks.value.some((bookmark) => bookmark.id === id)) {
      return { ok: false, reason: '未找到书签' }
    }

    let updatedBookmark: Bookmark | undefined

    const result = commit('切换 Dock 固定', () => {
      bookmarks.value = bookmarks.value.map((bookmark) =>
        bookmark.id === id
          ? (updatedBookmark = {
              ...bookmark,
              pin: !bookmark.pin,
              dockOrder: !bookmark.pin ? (bookmark.dockOrder ?? getNextDockOrder()) : undefined,
            })
          : bookmark,
      )
    })

    if (!updatedBookmark) return { ok: false, reason: '未找到书签' }
    if (!result.ok) return result

    return { ok: true, bookmark: updatedBookmark }
  }

  const reorderPinnedBookmarks = (
    draggedId: string,
    targetId: string,
    placement: DockDropPlacement,
  ): { ok: true } | { ok: false; reason: string } => {
    if (draggedId === targetId) return { ok: true }

    const pinnedBookmarks = getPinnedBookmarks(bookmarks.value)

    const draggedIndex = pinnedBookmarks.findIndex((bookmark) => bookmark.id === draggedId)
    const targetIndex = pinnedBookmarks.findIndex((bookmark) => bookmark.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      return { ok: false, reason: '未找到要排序的 Dock 书签' }
    }

    const [draggedBookmark] = pinnedBookmarks.splice(draggedIndex, 1)
    const nextTargetIndex = pinnedBookmarks.findIndex((bookmark) => bookmark.id === targetId)
    pinnedBookmarks.splice(
      placement === 'before' ? nextTargetIndex : nextTargetIndex + 1,
      0,
      draggedBookmark,
    )

    const dockOrderById = new Map(pinnedBookmarks.map((bookmark, index) => [bookmark.id, index]))
    return commit('调整 Dock 顺序', () => {
      bookmarks.value = bookmarks.value.map((bookmark) =>
        dockOrderById.has(bookmark.id)
          ? { ...bookmark, dockOrder: dockOrderById.get(bookmark.id) }
          : bookmark,
      )
    })
  }

  const movePinnedBookmarkByDirection = (
    id: string,
    direction: DockMoveDirection,
  ): { ok: true } | { ok: false; reason: string } => {
    const nextBookmarks = movePinnedBookmark(bookmarks.value, id, direction)

    if (nextBookmarks === bookmarks.value) return { ok: true }

    return commit('调整 Dock 顺序', () => {
      bookmarks.value = normalizeDockOrder(nextBookmarks)
    })
  }

  return {
    unpinBookmark,
    toggleBookmarkPin,
    reorderPinnedBookmarks,
    movePinnedBookmarkByDirection,
  }
}
