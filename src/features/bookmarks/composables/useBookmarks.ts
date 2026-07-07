import { computed, ref } from 'vue'
import {
  CATEGORY_ORDER,
  DEFAULT_BOOKMARKS,
  LOCAL_STORAGE_SOFT_LIMIT_BYTES,
  MAX_BACKUPS,
  MAX_UNDO_SNAPSHOTS,
  STALE_BOOKMARK_DAYS,
  UNCATEGORIZED_CATEGORY,
} from '../constants'
import {
  createBookmarkHtml,
  createExportData,
  getStorageUsage,
  loadBackups,
  loadBookmarks,
  loadCategories,
  loadDeletedCategories,
  loadSettings,
  loadUndoSnapshots,
  parseBookmarks,
  parseBookmarkHtml,
  parseImportData,
  saveBackups,
  saveBookmarks,
  saveCategories,
  saveSettings,
  saveUndoSnapshots,
} from '../storage'
import type {
  Bookmark,
  BookmarkActionResult,
  BookmarkBackup,
  BookmarkCleanupSummary,
  BookmarkDraft,
  BookmarkExportData,
  BookmarkIconMode,
  BookmarkSettings,
  BookmarkImportResult,
  BookmarkUndoResult,
  BulkOperationResult,
  CategoryMeta,
  CategorySummary,
  DockDropPlacement,
  DockMoveDirection,
  MutationResult,
  StorageUsage,
  TagSummary,
} from '../types'
import {
  createBookmarkId,
  getPinnedBookmarks,
  movePinnedBookmark,
  normalizeDockOrder,
  parseBookmarkUrl,
  sortCategories,
} from '../utils'

type CategoryDeleteResult = { ok: true; moved: number } | { ok: false; reason: string }

const createDraft = (
  category = Object.keys(CATEGORY_ORDER)[0] ?? UNCATEGORIZED_CATEGORY,
): BookmarkDraft => ({
  title: '',
  url: '',
  cat: category,
  icon: '',
  faviconUrl: '',
  pin: false,
  tagsText: '',
})

const createCategoryMeta = (
  name: string,
  order = CATEGORY_ORDER[name] ?? 99,
  hidden = false,
): CategoryMeta => ({
  name,
  order,
  hidden,
})

const createDefaultCategories = () => {
  return [...Object.keys(CATEGORY_ORDER), UNCATEGORIZED_CATEGORY].map((name) =>
    createCategoryMeta(name),
  )
}

const cloneBookmark = (bookmark: Bookmark): Bookmark => ({
  ...bookmark,
  tags: bookmark.tags ? [...bookmark.tags] : [],
})

const cloneCategory = (category: CategoryMeta): CategoryMeta => ({ ...category })

const cloneSettings = (settings: BookmarkSettings): BookmarkSettings => ({ ...settings })

const cloneBackup = (backup: BookmarkBackup): BookmarkBackup => ({
  ...backup,
  bookmarks: backup.bookmarks.map(cloneBookmark),
  categories: backup.categories.map(cloneCategory),
})

export const useBookmarks = () => {
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
  const storageUsage = ref<StorageUsage>({ usedBytes: 0, quotaBytes: LOCAL_STORAGE_SOFT_LIMIT_BYTES, percent: 0 })

  // Deferred: load non-critical data after initial render
  const loadDeferredData = () => {
    backups.value = loadBackups()
    undoSnapshots.value = loadUndoSnapshots()
    storageUsage.value = getStorageUsage()
  }
  const editingId = ref<string | null>(null)
  const draft = ref<BookmarkDraft>(createDraft())
  const isModalOpen = ref(false)

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

  const getDuplicateKey = (bookmark: Bookmark) => {
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

  const getBookmarkScore = (bookmark: Bookmark) => {
    const visitedAt = bookmark.lastVisitedAt ? new Date(bookmark.lastVisitedAt).getTime() : 0
    return (bookmark.pin ? 1_000_000 : 0) + (bookmark.visits ?? 0) * 1_000 + visitedAt
  }

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

  const refreshStorageUsage = () => {
    storageUsage.value = getStorageUsage()
  }

  const persist = () => {
    bookmarks.value = normalizeDockOrder(bookmarks.value)
    const saved =
      saveBookmarks(bookmarks.value) &&
      saveCategories(categoriesMeta.value) &&
      saveBackups(backups.value) &&
      saveUndoSnapshots(undoSnapshots.value) &&
      saveSettings(settings.value)

    refreshStorageUsage()
    return saved
  }

  const createSnapshot = (label: string): BookmarkBackup => {
    return {
      id: createBookmarkId(),
      createdAt: new Date().toISOString(),
      label,
      bookmarks: normalizeDockOrder(bookmarks.value).map(cloneBookmark),
      categories: categoriesMeta.value.map(cloneCategory),
    }
  }

  const createBackup = (label: string) => {
    const backup = createSnapshot(label)

    backups.value = [backup, ...backups.value].slice(0, MAX_BACKUPS)
  }

  const createUndoSnapshot = (label: string) => {
    undoSnapshots.value = [createSnapshot(label), ...undoSnapshots.value].slice(
      0,
      MAX_UNDO_SNAPSHOTS,
    )
  }

  const withSnapshot = (label: string, mutation: () => void, backup = false): MutationResult => {
    const previousBookmarks = bookmarks.value.map(cloneBookmark)
    const previousCategories = categoriesMeta.value.map(cloneCategory)
    const previousBackups = backups.value.map(cloneBackup)
    const previousUndoSnapshots = undoSnapshots.value.map(cloneBackup)
    const previousSettings = cloneSettings(settings.value)

    createUndoSnapshot(label)
    if (backup) createBackup(label)
    mutation()

    if (!persist()) {
      bookmarks.value = previousBookmarks
      categoriesMeta.value = previousCategories
      backups.value = previousBackups
      undoSnapshots.value = previousUndoSnapshots
      settings.value = previousSettings
      return { ok: false, reason: '保存失败：浏览器存储空间不足或不可用' }
    }

    return { ok: true }
  }

  const withBackup = (label: string, mutation: () => void): MutationResult => {
    return withSnapshot(label, mutation, true)
  }

  const withUndo = (label: string, mutation: () => void): MutationResult => {
    return withSnapshot(label, mutation, false)
  }

  const getNextDockOrder = () => {
    return getPinnedBookmarks(bookmarks.value).length
  }

  const upsertCategory = (name: string, hidden = false) => {
    const category = name.trim()
    if (!category) return

    const existing = categoriesMeta.value.find((item) => item.name === category)
    if (existing) {
      existing.hidden = hidden
      return
    }

    const maxOrder = categoriesMeta.value.reduce((max, item) => Math.max(max, item.order), 98)
    categoriesMeta.value = [
      ...categoriesMeta.value,
      createCategoryMeta(category, CATEGORY_ORDER[category] ?? maxOrder + 1, hidden),
    ]
  }

  const openAddModal = () => {
    editingId.value = null
    draft.value = createDraft(categories.value[0] ?? UNCATEGORIZED_CATEGORY)
    isModalOpen.value = true
  }

  const openEditModal = (bookmark: Bookmark) => {
    editingId.value = bookmark.id
    draft.value = {
      title: bookmark.title,
      url: bookmark.url,
      cat: bookmark.cat,
      icon: bookmark.icon,
      faviconUrl: bookmark.faviconUrl,
      pin: bookmark.pin,
      tagsText: (bookmark.tags ?? []).join(', '),
    }
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
    editingId.value = null
  }

  const saveDraft = ():
    | { ok: true; bookmark: Bookmark; created: boolean }
    | { ok: false; reason: string } => {
    const title = draft.value.title.trim()
    const url = parseBookmarkUrl(draft.value.url)
    const faviconUrl = draft.value.faviconUrl.trim() ? parseBookmarkUrl(draft.value.faviconUrl) : ''
    const cat = draft.value.cat.trim() || UNCATEGORIZED_CATEGORY
    const tags = draft.value.tagsText
      .split(/[,，\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)

    if (!title) return { ok: false, reason: '名称不能为空' }
    if (!url) return { ok: false, reason: '请输入有效的 http 或 https 网址' }
    if (faviconUrl === null) return { ok: false, reason: '请输入有效的 favicon URL' }

    const duplicated = bookmarks.value.find(
      (bookmark) => bookmark.url === url && bookmark.id !== editingId.value,
    )
    if (duplicated) return { ok: false, reason: `已存在：${duplicated.title}` }

    if (editingId.value) {
      if (!bookmarks.value.some((bookmark) => bookmark.id === editingId.value)) {
        return { ok: false, reason: '未找到要编辑的书签' }
      }

      let updatedBookmark: Bookmark | undefined
      const result = withUndo('编辑书签', () => {
        upsertCategory(cat)
        bookmarks.value = bookmarks.value.map((bookmark) =>
          bookmark.id === editingId.value
            ? (updatedBookmark = {
                ...bookmark,
                title,
                url,
                cat,
                icon: draft.value.icon.trim().slice(0, 8),
                faviconUrl,
                pin: draft.value.pin,
                tags,
                dockOrder: draft.value.pin ? (bookmark.dockOrder ?? getNextDockOrder()) : undefined,
              })
            : bookmark,
        )
      })

      if (!updatedBookmark) return { ok: false, reason: '未找到要编辑的书签' }
      if (!result.ok) return result
      closeModal()
      return { ok: true, bookmark: updatedBookmark, created: false }
    } else {
      const bookmark = {
        id: createBookmarkId(),
        title,
        url,
        cat,
        icon: draft.value.icon.trim().slice(0, 8),
        faviconUrl,
        pin: draft.value.pin,
        tags,
        dockOrder: draft.value.pin ? getNextDockOrder() : undefined,
      }
      const result = withUndo('添加书签', () => {
        upsertCategory(cat)
        bookmarks.value = [...bookmarks.value, bookmark]
      })

      if (!result.ok) return result
      closeModal()
      return { ok: true, bookmark, created: true }
    }
  }

  const importBookmarks = (raw: string): BookmarkImportResult => {
    const importFromHtml = () => {
      const bookmarks = parseBookmarkHtml(raw)
      return bookmarks.length ? { bookmarks, categories: [], backups: [], settings: null } : null
    }

    try {
      const parsed = JSON.parse(raw)
      const incoming = parseImportData(parsed) ?? importFromHtml()
      if (!incoming) return { ok: false, reason: '未找到可导入的书签数据' }

      const previousBookmarks = bookmarks.value.map(cloneBookmark)
      const previousCategories = categoriesMeta.value.map(cloneCategory)
      const previousBackups = backups.value.map(cloneBackup)
      const previousUndoSnapshots = undoSnapshots.value.map(cloneBackup)
      const previousSettings = cloneSettings(settings.value)
      const nextBookmarks = bookmarks.value.map(cloneBookmark)
      const byUrl = new Map(nextBookmarks.map((bookmark) => [bookmark.url, bookmark]))
      const result: BookmarkImportResult = {
        ok: true,
        added: 0,
        updated: 0,
        skipped: 0,
      }

      createUndoSnapshot('导入书签')
      createBackup('导入前备份')
      incoming.categories.forEach((category) => upsertCategory(category.name, category.hidden))
      if (incoming.settings) settings.value = cloneSettings(incoming.settings)

      incoming.bookmarks.forEach((bookmark) => {
        upsertCategory(bookmark.cat)
        const existing = byUrl.get(bookmark.url)
        if (!existing) {
          const nextBookmark = {
            ...bookmark,
            id: nextBookmarks.some((item) => item.id === bookmark.id)
              ? createBookmarkId()
              : bookmark.id,
          }
          nextBookmarks.push(nextBookmark)
          byUrl.set(nextBookmark.url, nextBookmark)
          result.added += 1
          return
        }

        const visits = bookmark.visits && bookmark.visits > 0 ? bookmark.visits : existing.visits
        const lastVisitedAt = bookmark.lastVisitedAt ?? existing.lastVisitedAt
        const hasChanges =
          existing.title !== bookmark.title ||
          existing.cat !== bookmark.cat ||
          existing.icon !== bookmark.icon ||
          existing.faviconUrl !== bookmark.faviconUrl ||
          existing.pin !== bookmark.pin ||
          existing.dockOrder !== bookmark.dockOrder ||
          (existing.tags ?? []).join(',') !== (bookmark.tags ?? []).join(',') ||
          existing.visits !== visits ||
          existing.lastVisitedAt !== lastVisitedAt

        if (!hasChanges) {
          result.skipped += 1
          return
        }

        Object.assign(existing, {
          title: bookmark.title,
          cat: bookmark.cat,
          icon: bookmark.icon,
          faviconUrl: bookmark.faviconUrl,
          pin: bookmark.pin,
          dockOrder: bookmark.dockOrder,
          tags: bookmark.tags ?? [],
          visits,
          lastVisitedAt,
        })
        result.updated += 1
      })

      backups.value = [...incoming.backups, ...backups.value].slice(0, MAX_BACKUPS)

      bookmarks.value = normalizeDockOrder(nextBookmarks)
      if (!persist()) {
        bookmarks.value = previousBookmarks
        categoriesMeta.value = previousCategories
        backups.value = previousBackups
        undoSnapshots.value = previousUndoSnapshots
        settings.value = previousSettings
        return { ok: false, reason: '导入失败：浏览器存储空间不足或不可用' }
      }
      return result
    } catch {
      const incoming = importFromHtml()
      if (!incoming) return { ok: false, reason: '未找到可导入的 JSON 或 HTML 书签数据' }

      const previousBookmarks = bookmarks.value.map(cloneBookmark)
      const previousCategories = categoriesMeta.value.map(cloneCategory)
      const previousBackups = backups.value.map(cloneBackup)
      const previousUndoSnapshots = undoSnapshots.value.map(cloneBackup)
      const previousSettings = cloneSettings(settings.value)
      const nextBookmarks = bookmarks.value.map(cloneBookmark)
      const byUrl = new Map(nextBookmarks.map((bookmark) => [bookmark.url, bookmark]))
      const result: BookmarkImportResult = {
        ok: true,
        added: 0,
        updated: 0,
        skipped: 0,
      }

      createUndoSnapshot('导入 HTML 书签')
      createBackup('导入前备份')
      incoming.bookmarks.forEach((bookmark) => {
        upsertCategory(bookmark.cat)
        const existing = byUrl.get(bookmark.url)
        if (!existing) {
          nextBookmarks.push(bookmark)
          byUrl.set(bookmark.url, bookmark)
          result.added += 1
          return
        }

        const hasChanges =
          existing.title !== bookmark.title ||
          existing.cat !== bookmark.cat ||
          existing.icon !== bookmark.icon ||
          existing.faviconUrl !== bookmark.faviconUrl ||
          (existing.tags ?? []).join(',') !== (bookmark.tags ?? []).join(',')

        if (!hasChanges) {
          result.skipped += 1
          return
        }

        Object.assign(existing, {
          title: bookmark.title,
          cat: bookmark.cat,
          icon: bookmark.icon,
          faviconUrl: bookmark.faviconUrl,
          tags: bookmark.tags ?? [],
        })
        result.updated += 1
      })

      bookmarks.value = normalizeDockOrder(nextBookmarks)
      if (!persist()) {
        bookmarks.value = previousBookmarks
        categoriesMeta.value = previousCategories
        backups.value = previousBackups
        undoSnapshots.value = previousUndoSnapshots
        settings.value = previousSettings
        return { ok: false, reason: '导入失败：浏览器存储空间不足或不可用' }
      }

      return result
    }
  }

  const removeBookmark = (id: string) => {
    return withBackup('删除书签', () => {
      bookmarks.value = bookmarks.value.filter((bookmark) => bookmark.id !== id)
    })
  }

  const deleteCategory = (category: string): CategoryDeleteResult => {
    const normalizedCategory = category.trim()

    if (!normalizedCategory) return { ok: false, reason: '分类名称无效' }
    if (normalizedCategory === UNCATEGORIZED_CATEGORY)
      return { ok: false, reason: '未分类不能删除' }

    const moved = bookmarks.value.filter((bookmark) => bookmark.cat === normalizedCategory).length

    const result = withBackup('删除分类', () => {
      bookmarks.value = bookmarks.value.map((bookmark) =>
        bookmark.cat === normalizedCategory
          ? { ...bookmark, cat: UNCATEGORIZED_CATEGORY }
          : bookmark,
      )
      upsertCategory(normalizedCategory, true)
    })

    return result.ok ? { ok: true, moved } : result
  }

  const unpinBookmark = (id: string): BookmarkActionResult => {
    if (!bookmarks.value.some((bookmark) => bookmark.id === id)) {
      return { ok: false, reason: '未找到要移除的书签' }
    }

    let updatedBookmark: Bookmark | undefined

    const result = withUndo('取消 Dock 固定', () => {
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

    const result = withUndo('切换 Dock 固定', () => {
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

  const bulkMoveCategory = (
    ids: string[],
    category: string,
  ): BulkOperationResult | { ok: false; reason: string } => {
    const uniqueIds = new Set(ids)
    const normalizedCategory = category.trim() || UNCATEGORIZED_CATEGORY

    const result = withBackup('批量移动分类', () => {
      upsertCategory(normalizedCategory)
      bookmarks.value = bookmarks.value.map((bookmark) =>
        uniqueIds.has(bookmark.id) ? { ...bookmark, cat: normalizedCategory } : bookmark,
      )
    })

    return result.ok ? { ok: true, count: uniqueIds.size } : result
  }

  const bulkSetPinned = (
    ids: string[],
    pin: boolean,
  ): BulkOperationResult | { ok: false; reason: string } => {
    const uniqueIds = new Set(ids)

    const result = withBackup(pin ? '批量固定到 Dock' : '批量取消 Dock', () => {
      bookmarks.value = bookmarks.value.map((bookmark) => {
        if (!uniqueIds.has(bookmark.id)) return bookmark
        return {
          ...bookmark,
          pin,
          dockOrder: pin ? (bookmark.dockOrder ?? getNextDockOrder()) : undefined,
        }
      })
    })

    return result.ok ? { ok: true, count: uniqueIds.size } : result
  }

  const bulkDelete = (ids: string[]): BulkOperationResult | { ok: false; reason: string } => {
    const uniqueIds = new Set(ids)

    const result = withBackup('批量删除书签', () => {
      bookmarks.value = bookmarks.value.filter((bookmark) => !uniqueIds.has(bookmark.id))
    })

    return result.ok ? { ok: true, count: uniqueIds.size } : result
  }

  const renameCategory = (from: string, to: string): MutationResult => {
    const source = from.trim()
    const target = to.trim()
    if (!source || !target) return { ok: false, reason: '分类名称不能为空' }
    if (source === UNCATEGORIZED_CATEGORY) return { ok: false, reason: '未分类不能重命名' }
    if (source === target) return { ok: true }

    return withBackup('重命名分类', () => {
      bookmarks.value = bookmarks.value.map((bookmark) =>
        bookmark.cat === source ? { ...bookmark, cat: target } : bookmark,
      )
      categoriesMeta.value = categoriesMeta.value
        .filter((category) => category.name !== target)
        .map((category) =>
          category.name === source ? { ...category, name: target, hidden: false } : category,
        )
      upsertCategory(target)
    })
  }

  const mergeCategory = (from: string, to: string): MutationResult => {
    const source = from.trim()
    const target = to.trim()
    if (!source || !target) return { ok: false, reason: '分类名称不能为空' }
    if (source === target) return { ok: true }

    return withBackup('合并分类', () => {
      bookmarks.value = bookmarks.value.map((bookmark) =>
        bookmark.cat === source ? { ...bookmark, cat: target } : bookmark,
      )
      categoriesMeta.value = categoriesMeta.value.map((category) =>
        category.name === source ? { ...category, hidden: true } : category,
      )
      upsertCategory(target)
    })
  }

  const moveCategory = (category: string, direction: DockMoveDirection): MutationResult => {
    const sorted = sortCategories(categoriesMeta.value)
    const index = sorted.findIndex((item) => item.name === category)
    const targetIndex = direction === 'left' ? index - 1 : index + 1
    if (index === -1 || targetIndex < 0 || targetIndex >= sorted.length) return { ok: true }

    return withBackup('调整分类排序', () => {
      const current = sorted[index]
      const target = sorted[targetIndex]
      const currentOrder = current.order
      current.order = target.order
      target.order = currentOrder
      categoriesMeta.value = [...sorted]
    })
  }

  const setCategoryHidden = (category: string, hidden: boolean): MutationResult => {
    if (category === UNCATEGORIZED_CATEGORY && hidden)
      return { ok: false, reason: '未分类不能隐藏' }

    return withBackup(hidden ? '隐藏分类' : '恢复分类', () => {
      upsertCategory(category, hidden)
    })
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
    return withUndo('调整 Dock 顺序', () => {
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

    return withUndo('调整 Dock 顺序', () => {
      bookmarks.value = normalizeDockOrder(nextBookmarks)
    })
  }

  const exportBookmarks = (): BookmarkExportData => {
    return createExportData(bookmarks.value, categoriesMeta.value, backups.value, settings.value)
  }

  const exportSelectedBookmarks = (ids: string[]): BookmarkExportData => {
    const selected = new Set(ids)
    return createExportData(
      bookmarks.value.filter((bookmark) => selected.has(bookmark.id)),
      categoriesMeta.value,
      [],
      settings.value,
    )
  }

  const exportBookmarksAsHtml = (ids?: string[]): string => {
    const selected = ids ? new Set(ids) : null
    const exportedBookmarks = selected
      ? bookmarks.value.filter((bookmark) => selected.has(bookmark.id))
      : bookmarks.value
    return createBookmarkHtml(exportedBookmarks)
  }

  const setIconMode = (iconMode: BookmarkIconMode): MutationResult => {
    const previousSettings = cloneSettings(settings.value)
    settings.value = { ...settings.value, iconMode }

    if (!saveSettings(settings.value)) {
      settings.value = previousSettings
      return { ok: false, reason: '保存设置失败：浏览器存储空间不足或不可用' }
    }

    refreshStorageUsage()
    return { ok: true }
  }

  const clearBackups = (): BulkOperationResult | { ok: false; reason: string } => {
    const count = backups.value.length
    const previousBackups = backups.value.map(cloneBackup)

    backups.value = []
    if (!persist()) {
      backups.value = previousBackups
      return { ok: false, reason: '清理备份失败：浏览器存储空间不足或不可用' }
    }

    return { ok: true, count }
  }

  const cleanupEmptyCategories = (): BulkOperationResult | { ok: false; reason: string } => {
    const emptyCategories = new Set(cleanupSummary.value.emptyCategories)
    const result = withBackup('清理空分类', () => {
      categoriesMeta.value = categoriesMeta.value.filter(
        (category) => !emptyCategories.has(category.name),
      )
    })

    return result.ok ? { ok: true, count: emptyCategories.size } : result
  }

  const removeLowFrequencyTags = (): BulkOperationResult | { ok: false; reason: string } => {
    const tags = new Set(cleanupSummary.value.lowFrequencyTags.map((tag) => tag.name))
    const result = withBackup('清理低频标签', () => {
      bookmarks.value = bookmarks.value.map((bookmark) => ({
        ...bookmark,
        tags: (bookmark.tags ?? []).filter((tag) => !tags.has(tag)),
      }))
    })

    return result.ok ? { ok: true, count: tags.size } : result
  }

  const removeStaleBookmarks = (): BulkOperationResult | { ok: false; reason: string } => {
    const staleIds = new Set(cleanupSummary.value.staleBookmarks.map((bookmark) => bookmark.id))
    const result = withBackup('清理长期未访问书签', () => {
      bookmarks.value = bookmarks.value.filter((bookmark) => !staleIds.has(bookmark.id))
    })

    return result.ok ? { ok: true, count: staleIds.size } : result
  }

  const deduplicateBookmarks = (): BulkOperationResult | { ok: false; reason: string } => {
    const duplicateKeys = new Set(cleanupSummary.value.duplicateGroups.map((group) => group.url))
    let removed = 0

    const result = withBackup('合并重复书签', () => {
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
    })

    return result.ok ? { ok: true, count: removed } : result
  }

  const recordBookmarkVisit = (id: string): BookmarkActionResult => {
    let visitedBookmark: Bookmark | undefined
    const previousBookmarks = bookmarks.value.map(cloneBookmark)

    bookmarks.value = bookmarks.value.map((bookmark) =>
      bookmark.id === id
        ? (visitedBookmark = {
            ...bookmark,
            visits: (bookmark.visits ?? 0) + 1,
            lastVisitedAt: new Date().toISOString(),
          })
        : bookmark,
    )

    if (!visitedBookmark) return { ok: false, reason: '未找到书签' }

    if (!persist()) {
      bookmarks.value = previousBookmarks
      return { ok: false, reason: '访问统计保存失败：浏览器存储空间不足或不可用' }
    }

    return { ok: true, bookmark: visitedBookmark }
  }

  const restoreBackup = (id: string): MutationResult => {
    const backup = backups.value.find((item) => item.id === id)
    if (!backup) return { ok: false, reason: '未找到备份' }

    return withBackup('恢复前自动备份', () => {
      bookmarks.value = normalizeDockOrder(backup.bookmarks)
      categoriesMeta.value = backup.categories.map((category) => ({ ...category }))
    })
  }

  const resetBookmarks = () => {
    bookmarks.value = parseBookmarks(DEFAULT_BOOKMARKS)
    categoriesMeta.value = createDefaultCategories()
    persist()
  }

  const undoLastChange = (): BookmarkUndoResult => {
    const snapshot = undoSnapshots.value[0]
    if (!snapshot) return { ok: false, reason: '没有可撤销的操作' }

    const previousBookmarks = bookmarks.value.map(cloneBookmark)
    const previousCategories = categoriesMeta.value.map(cloneCategory)
    const previousUndoSnapshots = undoSnapshots.value.map(cloneBackup)

    bookmarks.value = normalizeDockOrder(snapshot.bookmarks).map(cloneBookmark)
    categoriesMeta.value = snapshot.categories.map(cloneCategory)
    undoSnapshots.value = undoSnapshots.value.slice(1)

    if (!persist()) {
      bookmarks.value = previousBookmarks
      categoriesMeta.value = previousCategories
      undoSnapshots.value = previousUndoSnapshots
      return { ok: false, reason: '撤销失败：浏览器存储空间不足或不可用' }
    }

    return { ok: true, label: snapshot.label }
  }

  return {
    bookmarks,
    categories,
    categorySummaries,
    tagSummaries,
    cleanupSummary,
    backups,
    undoSnapshots,
    settings,
    storageUsage,
    draft,
    editingId,
    isModalOpen,
    openAddModal,
    openEditModal,
    closeModal,
    saveDraft,
    importBookmarks,
    exportBookmarksAsHtml,
    recordBookmarkVisit,
    undoLastChange,
    removeBookmark,
    deleteCategory,
    bulkMoveCategory,
    bulkSetPinned,
    bulkDelete,
    renameCategory,
    mergeCategory,
    moveCategory,
    setCategoryHidden,
    unpinBookmark,
    toggleBookmarkPin,
    reorderPinnedBookmarks,
    movePinnedBookmarkByDirection,
    exportBookmarks,
    exportSelectedBookmarks,
    restoreBackup,
    setIconMode,
    clearBackups,
    cleanupEmptyCategories,
    removeLowFrequencyTags,
    removeStaleBookmarks,
    deduplicateBookmarks,
    resetBookmarks,
    loadDeferredData,
  }
}
