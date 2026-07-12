import type { Bookmark, BulkOperationResult } from '../../types'
import { getBookmarkScore, getDuplicateKey, type BookmarkStore } from './store'

export const createCleanupActions = (store: BookmarkStore) => {
  const { bookmarks, categoriesMeta, cleanupSummary, commit } = store

  const cleanupEmptyCategories = (): BulkOperationResult | { ok: false; reason: string } => {
    const emptyCategories = new Set(cleanupSummary.value.emptyCategories)
    const result = commit(
      '清理空分类',
      () => {
        categoriesMeta.value = categoriesMeta.value.filter(
          (category) => !emptyCategories.has(category.name),
        )
      },
      { backup: true },
    )

    return result.ok ? { ok: true, count: emptyCategories.size } : result
  }

  const removeLowFrequencyTags = (): BulkOperationResult | { ok: false; reason: string } => {
    const tags = new Set(cleanupSummary.value.lowFrequencyTags.map((tag) => tag.name))
    const result = commit(
      '清理低频标签',
      () => {
        bookmarks.value = bookmarks.value.map((bookmark) => ({
          ...bookmark,
          tags: (bookmark.tags ?? []).filter((tag) => !tags.has(tag)),
        }))
      },
      { backup: true },
    )

    return result.ok ? { ok: true, count: tags.size } : result
  }

  const removeStaleBookmarks = (): BulkOperationResult | { ok: false; reason: string } => {
    const staleIds = new Set(cleanupSummary.value.staleBookmarks.map((bookmark) => bookmark.id))
    const result = commit(
      '清理长期未访问书签',
      () => {
        bookmarks.value = bookmarks.value.filter((bookmark) => !staleIds.has(bookmark.id))
      },
      { backup: true },
    )

    return result.ok ? { ok: true, count: staleIds.size } : result
  }

  const deduplicateBookmarks = (): BulkOperationResult | { ok: false; reason: string } => {
    const duplicateKeys = new Set(cleanupSummary.value.duplicateGroups.map((group) => group.url))
    let removed = 0

    const result = commit(
      '合并重复书签',
      () => {
        const bestByKey = new Map<string, Bookmark>()

        bookmarks.value.forEach((bookmark) => {
          const key = getDuplicateKey(bookmark)
          if (!duplicateKeys.has(key)) return

          const current = bestByKey.get(key)
          if (!current || getBookmarkScore(bookmark) > getBookmarkScore(current)) {
            bestByKey.set(key, bookmark)
          }
        })

        bookmarks.value = bookmarks.value.filter((bookmark) => {
          const key = getDuplicateKey(bookmark)
          if (!duplicateKeys.has(key)) return true
          const keep = bestByKey.get(key)?.id === bookmark.id
          if (!keep) removed += 1
          return keep
        })
      },
      { backup: true },
    )

    return result.ok ? { ok: true, count: removed } : result
  }

  return {
    cleanupEmptyCategories,
    removeLowFrequencyTags,
    removeStaleBookmarks,
    deduplicateBookmarks,
  }
}
