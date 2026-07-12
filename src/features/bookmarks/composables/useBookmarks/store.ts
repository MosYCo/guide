import { computed, ref, type ComputedRef, type Ref } from 'vue'
import {
  CATEGORY_ORDER,
  LOCAL_STORAGE_SOFT_LIMIT_BYTES,
  MAX_BACKUPS,
  MAX_UNDO_SNAPSHOTS,
  STALE_BOOKMARK_DAYS,
  UNCATEGORIZED_CATEGORY,
} from '../../constants'
import {
  getStorageUsage,
  loadBackups,
  loadBookmarks,
  loadCategories,
  loadDeletedCategories,
  loadSettings,
  loadUndoSnapshots,
  saveBackups,
  saveBookmarks,
  saveCategories,
  saveSettings,
  saveUndoSnapshots,
} from '../../storage'
import type {
  Bookmark,
  BookmarkBackup,
  BookmarkCleanupSummary,
  BookmarkSettings,
  CategoryMeta,
  CategorySummary,
  MutationResult,
  StorageUsage,
  TagSummary,
} from '../../types'
import { createBookmarkId, normalizeDockOrder, sortCategories } from '../../utils'

// State invariant: bookmarks/categoriesMeta/backups/undoSnapshots/settings are never
// mutated in place. Every change replaces the ref value with a new array/object, so
// snapshots and rollback can capture plain references instead of deep clones.

export interface CommitOptions {
  undo?: boolean
  backup?: boolean
  backupLabel?: string
  failReason?: string
}

const DEFAULT_FAIL_REASON = '保存失败：浏览器存储空间不足或不可用'

export const createCategoryMeta = (
  name: string,
  order = CATEGORY_ORDER[name] ?? 99,
  hidden = false,
): CategoryMeta => ({
  name,
  order,
  hidden,
})

export const createDefaultCategories = () => {
  return [...Object.keys(CATEGORY_ORDER), UNCATEGORIZED_CATEGORY].map((name) =>
    createCategoryMeta(name),
  )
}

export const getDuplicateKey = (bookmark: Bookmark) => {
  try {
    const url = new URL(bookmark.url)
    url.hash = ''
    url.hostname = url.hostname.replace(/^www\./, '').toLowerCase()
    url.pathname = url.pathname.replace(/\/+$/, '') || '/'
    return `${url.protocol}//${url.hostname}${url.pathname}${url.search}`.toLowerCase()
  } catch {
    return bookmark.url.trim().toLowerCase()
  }
}

export const getBookmarkScore = (bookmark: Bookmark) => {
  const visitedAt = bookmark.lastVisitedAt ? new Date(bookmark.lastVisitedAt).getTime() : 0
  return (bookmark.pin ? 1_000_000 : 0) + (bookmark.visits ?? 0) * 1_000 + visitedAt
}

export interface BookmarkStore {
  bookmarks: Ref<Bookmark[]>
  categoriesMeta: Ref<CategoryMeta[]>
  backups: Ref<BookmarkBackup[]>
  undoSnapshots: Ref<BookmarkBackup[]>
  settings: Ref<BookmarkSettings>
  storageUsage: Ref<StorageUsage>
  categories: ComputedRef<string[]>
  categorySummaries: ComputedRef<CategorySummary[]>
  tagSummaries: ComputedRef<TagSummary[]>
  cleanupSummary: ComputedRef<BookmarkCleanupSummary>
  persist(): boolean
  commit(label: string, mutation: () => void, options?: CommitOptions): MutationResult
  upsertCategory(name: string, hidden?: boolean): void
  getNextDockOrder(): number
  loadDeferredData(): void
}

export const createBookmarkStore = (): BookmarkStore => {
  const bookmarks = ref<Bookmark[]>(normalizeDockOrder(loadBookmarks()))
  const categoriesMeta = ref<CategoryMeta[]>([
    ...createDefaultCategories(),
    ...loadCategories(),
    ...loadDeletedCategories().map((name) =>
      createCategoryMeta(name, CATEGORY_ORDER[name] ?? 99, true),
    ),
  ])
  const backups = ref<BookmarkBackup[]>([])
  const undoSnapshots = ref<BookmarkBackup[]>([])
  const settings = ref<BookmarkSettings>(loadSettings())
  const storageUsage = ref<StorageUsage>({
    usedBytes: 0,
    quotaBytes: LOCAL_STORAGE_SOFT_LIMIT_BYTES,
    percent: 0,
  })

  // Last value written to (or loaded from) localStorage per key. persist() compares
  // by reference and skips keys whose ref value has not been replaced since.
  const persisted = {
    bookmarks: bookmarks.value,
    categories: categoriesMeta.value,
    backups: backups.value,
    undoSnapshots: undoSnapshots.value,
    settings: settings.value,
  }

  // Deferred: load non-critical data after initial render
  const loadDeferredData = () => {
    backups.value = loadBackups()
    undoSnapshots.value = loadUndoSnapshots()
    persisted.backups = backups.value
    persisted.undoSnapshots = undoSnapshots.value
    storageUsage.value = getStorageUsage()
  }

  const categories = computed(() => {
    const bookmarkCategories = new Set(bookmarks.value.map((bookmark) => bookmark.cat))
    const metaByName = new Map(categoriesMeta.value.map((category) => [category.name, category]))

    bookmarkCategories.forEach((category) => {
      if (!metaByName.has(category)) {
        metaByName.set(category, createCategoryMeta(category))
      }
    })
    metaByName.set(
      UNCATEGORIZED_CATEGORY,
      metaByName.get(UNCATEGORIZED_CATEGORY) ?? createCategoryMeta(UNCATEGORIZED_CATEGORY),
    )

    return sortCategories([...metaByName.values()].filter((category) => !category.hidden)).map(
      (category) => category.name,
    )
  })

  const categorySummaries = computed<CategorySummary[]>(() => {
    const counts = bookmarks.value.reduce<Record<string, number>>((result, bookmark) => {
      result[bookmark.cat] = (result[bookmark.cat] ?? 0) + 1
      return result
    }, {})
    const metaByName = new Map(categoriesMeta.value.map((category) => [category.name, category]))

    categories.value.forEach((category) => {
      if (!metaByName.has(category)) {
        metaByName.set(category, createCategoryMeta(category))
      }
    })

    return sortCategories([...metaByName.values()]).map((category) => ({
      ...category,
      count: counts[category.name] ?? 0,
    }))
  })

  const tagSummaries = computed<TagSummary[]>(() => {
    const counts = bookmarks.value.reduce<Record<string, number>>((result, bookmark) => {
      ;(bookmark.tags ?? []).forEach((tag) => {
        result[tag] = (result[tag] ?? 0) + 1
      })
      return result
    }, {})

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((tagA, tagB) =>
        tagA.count === tagB.count ? tagA.name.localeCompare(tagB.name) : tagB.count - tagA.count,
      )
  })

  const cleanupSummary = computed<BookmarkCleanupSummary>(() => {
    const duplicateBuckets = bookmarks.value.reduce<Record<string, Bookmark[]>>(
      (result, bookmark) => {
        const key = getDuplicateKey(bookmark)
        result[key] = result[key] ?? []
        result[key].push(bookmark)
        return result
      },
      {},
    )
    const categoryCounts = bookmarks.value.reduce<Record<string, number>>((result, bookmark) => {
      result[bookmark.cat] = (result[bookmark.cat] ?? 0) + 1
      return result
    }, {})
    const staleBefore = Date.now() - STALE_BOOKMARK_DAYS * 86_400_000

    return {
      duplicateGroups: Object.entries(duplicateBuckets)
        .filter(([, items]) => items.length > 1)
        .map(([url, items]) => ({ url, items })),
      staleBookmarks: bookmarks.value.filter((bookmark) => {
        if (bookmark.pin) return false
        const visitedAt = bookmark.lastVisitedAt ? new Date(bookmark.lastVisitedAt).getTime() : 0
        return !visitedAt || visitedAt < staleBefore
      }),
      emptyCategories: categoriesMeta.value
        .filter(
          (category) =>
            !category.hidden &&
            category.name !== UNCATEGORIZED_CATEGORY &&
            (categoryCounts[category.name] ?? 0) === 0,
        )
        .map((category) => category.name),
      lowFrequencyTags: tagSummaries.value.filter((tag) => tag.count === 1),
    }
  })

  const persist = (): boolean => {
    if (bookmarks.value !== persisted.bookmarks) {
      bookmarks.value = normalizeDockOrder(bookmarks.value)
    }

    const entries = [
      {
        changed: bookmarks.value !== persisted.bookmarks,
        write: () => saveBookmarks(bookmarks.value),
        revert: () => saveBookmarks(persisted.bookmarks),
        commit: () => {
          persisted.bookmarks = bookmarks.value
        },
      },
      {
        changed: categoriesMeta.value !== persisted.categories,
        write: () => saveCategories(categoriesMeta.value),
        revert: () => saveCategories(persisted.categories),
        commit: () => {
          persisted.categories = categoriesMeta.value
        },
      },
      {
        changed: backups.value !== persisted.backups,
        write: () => saveBackups(backups.value),
        revert: () => saveBackups(persisted.backups),
        commit: () => {
          persisted.backups = backups.value
        },
      },
      {
        changed: undoSnapshots.value !== persisted.undoSnapshots,
        write: () => saveUndoSnapshots(undoSnapshots.value),
        revert: () => saveUndoSnapshots(persisted.undoSnapshots),
        commit: () => {
          persisted.undoSnapshots = undoSnapshots.value
        },
      },
      {
        changed: settings.value !== persisted.settings,
        write: () => saveSettings(settings.value),
        revert: () => saveSettings(persisted.settings),
        commit: () => {
          persisted.settings = settings.value
        },
      },
    ].filter((entry) => entry.changed)

    const written: typeof entries = []
    for (const entry of entries) {
      if (!entry.write()) {
        // Best effort: put already-written keys back so storage stays consistent
        // with the in-memory state the caller is about to roll back to.
        written.forEach((writtenEntry) => writtenEntry.revert())
        return false
      }
      written.push(entry)
    }

    entries.forEach((entry) => entry.commit())
    if (entries.length) {
      storageUsage.value = getStorageUsage()
    }
    return true
  }

  const createSnapshot = (label: string): BookmarkBackup => ({
    id: createBookmarkId(),
    createdAt: new Date().toISOString(),
    label,
    bookmarks: bookmarks.value,
    categories: categoriesMeta.value,
  })

  const commit = (label: string, mutation: () => void, options: CommitOptions = {}): MutationResult => {
    const { undo = true, backup = false, backupLabel = label, failReason = DEFAULT_FAIL_REASON } = options
    const previous = {
      bookmarks: bookmarks.value,
      categories: categoriesMeta.value,
      backups: backups.value,
      undoSnapshots: undoSnapshots.value,
      settings: settings.value,
    }

    if (undo) {
      undoSnapshots.value = [createSnapshot(label), ...undoSnapshots.value].slice(
        0,
        MAX_UNDO_SNAPSHOTS,
      )
    }
    if (backup) {
      backups.value = [createSnapshot(backupLabel), ...backups.value].slice(0, MAX_BACKUPS)
    }
    mutation()

    if (!persist()) {
      bookmarks.value = previous.bookmarks
      categoriesMeta.value = previous.categories
      backups.value = previous.backups
      undoSnapshots.value = previous.undoSnapshots
      settings.value = previous.settings
      return { ok: false, reason: failReason }
    }

    return { ok: true }
  }

  const upsertCategory = (name: string, hidden = false) => {
    const category = name.trim()
    if (!category) return

    const existing = categoriesMeta.value.find((item) => item.name === category)
    if (existing) {
      if (existing.hidden !== hidden) {
        categoriesMeta.value = categoriesMeta.value.map((item) =>
          item.name === category ? { ...item, hidden } : item,
        )
      }
      return
    }

    const maxOrder = categoriesMeta.value.reduce((max, item) => Math.max(max, item.order), 98)
    categoriesMeta.value = [
      ...categoriesMeta.value,
      createCategoryMeta(category, CATEGORY_ORDER[category] ?? maxOrder + 1, hidden),
    ]
  }

  const getNextDockOrder = () => {
    return bookmarks.value.filter((bookmark) => bookmark.pin).length
  }

  return {
    bookmarks,
    categoriesMeta,
    backups,
    undoSnapshots,
    settings,
    storageUsage,
    categories,
    categorySummaries,
    tagSummaries,
    cleanupSummary,
    persist,
    commit,
    upsertCategory,
    getNextDockOrder,
    loadDeferredData,
  }
}
