import { computed, ref } from 'vue'
import { CATEGORY_ORDER, DEFAULT_BOOKMARKS, UNCATEGORIZED_CATEGORY } from '../constants'
import {
  createExportData,
  loadBookmarks,
  loadCategories,
  loadDeletedCategories,
  parseBookmarks,
  parseImportData,
  saveBookmarks,
  saveCategories,
} from '../storage'
import type {
  Bookmark,
  BookmarkDraft,
  BookmarkExportData,
  BookmarkImportResult,
  CategoryMeta,
  DockDropPlacement,
  DockMoveDirection,
} from '../types'
import {
  createBookmarkId,
  getPinnedBookmarks,
  movePinnedBookmark,
  normalizeDockOrder,
  parseBookmarkUrl,
  sortCategories,
} from '../utils'

type BookmarkActionResult = { ok: true; bookmark: Bookmark } | { ok: false; reason: string }
type CategoryDeleteResult = { ok: true; moved: number } | { ok: false; reason: string }

const createDraft = (category = Object.keys(CATEGORY_ORDER)[0] ?? UNCATEGORIZED_CATEGORY): BookmarkDraft => ({
  title: '',
  url: '',
  cat: category,
  icon: '',
  faviconUrl: '',
  pin: false,
})

const createCategoryMeta = (name: string, order = CATEGORY_ORDER[name] ?? 99, hidden = false): CategoryMeta => ({
  name,
  order,
  hidden,
})

const createDefaultCategories = () => {
  return [...Object.keys(CATEGORY_ORDER), UNCATEGORIZED_CATEGORY].map((name) => createCategoryMeta(name))
}

export const useBookmarks = () => {
  const bookmarks = ref<Bookmark[]>(normalizeDockOrder(loadBookmarks()))
  const categoriesMeta = ref<CategoryMeta[]>([
    ...createDefaultCategories(),
    ...loadCategories(),
    ...loadDeletedCategories().map((name) => createCategoryMeta(name, CATEGORY_ORDER[name] ?? 99, true)),
  ])
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
    metaByName.set(UNCATEGORIZED_CATEGORY, metaByName.get(UNCATEGORIZED_CATEGORY) ?? createCategoryMeta(UNCATEGORIZED_CATEGORY))

    return sortCategories([...metaByName.values()].filter((category) => !category.hidden || bookmarkCategories.has(category.name))).map(
      (category) => category.name,
    )
  })

  const persist = () => {
    bookmarks.value = normalizeDockOrder(bookmarks.value)
    return saveBookmarks(bookmarks.value) && saveCategories(categoriesMeta.value)
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
    categoriesMeta.value = [...categoriesMeta.value, createCategoryMeta(category, CATEGORY_ORDER[category] ?? maxOrder + 1, hidden)]
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
    }
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
    editingId.value = null
  }

  const saveDraft = (): { ok: true; bookmark: Bookmark; created: boolean } | { ok: false; reason: string } => {
    const title = draft.value.title.trim()
    const url = parseBookmarkUrl(draft.value.url)
    const faviconUrl = draft.value.faviconUrl.trim() ? parseBookmarkUrl(draft.value.faviconUrl) : ''
    const cat = draft.value.cat.trim() || UNCATEGORIZED_CATEGORY

    if (!title) return { ok: false, reason: '名称不能为空' }
    if (!url) return { ok: false, reason: '请输入有效的 http 或 https 网址' }
    if (faviconUrl === null) return { ok: false, reason: '请输入有效的 favicon URL' }

    const duplicated = bookmarks.value.find((bookmark) => bookmark.url === url && bookmark.id !== editingId.value)
    if (duplicated) return { ok: false, reason: `已存在：${duplicated.title}` }

    upsertCategory(cat)

    if (editingId.value) {
      let updatedBookmark: Bookmark | undefined
      const previousBookmarks = bookmarks.value
      const previousCategories = categoriesMeta.value.map((category) => ({ ...category }))
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
                dockOrder: draft.value.pin
                  ? (bookmark.dockOrder ?? getNextDockOrder())
                  : undefined,
              })
          : bookmark,
      )

      if (!updatedBookmark) return { ok: false, reason: '未找到要编辑的书签' }

      if (!persist()) {
        bookmarks.value = previousBookmarks
        categoriesMeta.value = previousCategories
        return { ok: false, reason: '保存失败：浏览器存储空间不足或不可用' }
      }
      closeModal()
      return { ok: true, bookmark: updatedBookmark, created: false }
    } else {
      const previousBookmarks = bookmarks.value
      const previousCategories = categoriesMeta.value.map((category) => ({ ...category }))
      const bookmark = {
        id: createBookmarkId(),
        title,
        url,
        cat,
        icon: draft.value.icon.trim().slice(0, 8),
        faviconUrl,
        pin: draft.value.pin,
        dockOrder: draft.value.pin ? getNextDockOrder() : undefined,
      }
      bookmarks.value = [
        ...bookmarks.value,
        bookmark,
      ]
      if (!persist()) {
        bookmarks.value = previousBookmarks
        categoriesMeta.value = previousCategories
        return { ok: false, reason: '保存失败：浏览器存储空间不足或不可用' }
      }
      closeModal()
      return { ok: true, bookmark, created: true }
    }
  }

  const importBookmarks = (raw: string): BookmarkImportResult | null => {
    try {
      const incoming = parseImportData(JSON.parse(raw))
      if (!incoming) return null

      const previousBookmarks = bookmarks.value
      const previousCategories = categoriesMeta.value.map((category) => ({ ...category }))
      const nextBookmarks = bookmarks.value.map((bookmark) => ({ ...bookmark }))
      const byUrl = new Map(nextBookmarks.map((bookmark) => [bookmark.url, bookmark]))
      const result: BookmarkImportResult = {
        added: 0,
        updated: 0,
        skipped: 0,
      }

      incoming.categories.forEach((category) => upsertCategory(category.name, category.hidden))

      incoming.bookmarks.forEach((bookmark) => {
        upsertCategory(bookmark.cat)
        const existing = byUrl.get(bookmark.url)
        if (!existing) {
          const nextBookmark = {
            ...bookmark,
            id: nextBookmarks.some((item) => item.id === bookmark.id) ? createBookmarkId() : bookmark.id,
          }
          nextBookmarks.push(nextBookmark)
          byUrl.set(nextBookmark.url, nextBookmark)
          result.added += 1
          return
        }

        const hasChanges =
          existing.title !== bookmark.title ||
          existing.cat !== bookmark.cat ||
          existing.icon !== bookmark.icon ||
          existing.faviconUrl !== bookmark.faviconUrl ||
          existing.pin !== bookmark.pin ||
          existing.dockOrder !== bookmark.dockOrder

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
        })
        result.updated += 1
      })

      bookmarks.value = normalizeDockOrder(nextBookmarks)
      if (!persist()) {
        bookmarks.value = previousBookmarks
        categoriesMeta.value = previousCategories
        return null
      }
      return result
    } catch {
      return null
    }
  }

  const removeBookmark = (id: string) => {
    bookmarks.value = bookmarks.value.filter((bookmark) => bookmark.id !== id)
    persist()
  }

  const deleteCategory = (category: string): CategoryDeleteResult => {
    const normalizedCategory = category.trim()

    if (!normalizedCategory) return { ok: false, reason: '分类名称无效' }
    if (normalizedCategory === UNCATEGORIZED_CATEGORY) return { ok: false, reason: '未分类不能删除' }

    const previousBookmarks = bookmarks.value
    const previousCategories = categoriesMeta.value.map((item) => ({ ...item }))
    const moved = bookmarks.value.filter((bookmark) => bookmark.cat === normalizedCategory).length

    bookmarks.value = bookmarks.value.map((bookmark) =>
      bookmark.cat === normalizedCategory ? { ...bookmark, cat: UNCATEGORIZED_CATEGORY } : bookmark,
    )
    upsertCategory(normalizedCategory, true)

    if (!persist()) {
      bookmarks.value = previousBookmarks
      categoriesMeta.value = previousCategories
      return { ok: false, reason: '删除失败：浏览器存储空间不足或不可用' }
    }

    return { ok: true, moved }
  }

  const unpinBookmark = (id: string): BookmarkActionResult => {
    const previousBookmarks = bookmarks.value
    let updatedBookmark: Bookmark | undefined

    bookmarks.value = bookmarks.value.map((bookmark) =>
      bookmark.id === id ? (updatedBookmark = { ...bookmark, pin: false, dockOrder: undefined }) : bookmark,
    )

    if (!updatedBookmark) return { ok: false, reason: '未找到要移除的书签' }

    if (!persist()) {
      bookmarks.value = previousBookmarks
      return { ok: false, reason: '保存失败：浏览器存储空间不足或不可用' }
    }

    return { ok: true, bookmark: updatedBookmark }
  }

  const reorderPinnedBookmarks = (
    draggedId: string,
    targetId: string,
    placement: DockDropPlacement,
  ): { ok: true } | { ok: false; reason: string } => {
    if (draggedId === targetId) return { ok: true }

    const previousBookmarks = bookmarks.value
    const pinnedBookmarks = getPinnedBookmarks(bookmarks.value)

    const draggedIndex = pinnedBookmarks.findIndex((bookmark) => bookmark.id === draggedId)
    const targetIndex = pinnedBookmarks.findIndex((bookmark) => bookmark.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      return { ok: false, reason: '未找到要排序的 Dock 书签' }
    }

    const [draggedBookmark] = pinnedBookmarks.splice(draggedIndex, 1)
    const nextTargetIndex = pinnedBookmarks.findIndex((bookmark) => bookmark.id === targetId)
    pinnedBookmarks.splice(placement === 'before' ? nextTargetIndex : nextTargetIndex + 1, 0, draggedBookmark)

    const dockOrderById = new Map(pinnedBookmarks.map((bookmark, index) => [bookmark.id, index]))
    bookmarks.value = bookmarks.value.map((bookmark) =>
      dockOrderById.has(bookmark.id) ? { ...bookmark, dockOrder: dockOrderById.get(bookmark.id) } : bookmark,
    )

    if (!persist()) {
      bookmarks.value = previousBookmarks
      return { ok: false, reason: '排序保存失败：浏览器存储空间不足或不可用' }
    }

    return { ok: true }
  }

  const movePinnedBookmarkByDirection = (
    id: string,
    direction: DockMoveDirection,
  ): { ok: true } | { ok: false; reason: string } => {
    const previousBookmarks = bookmarks.value
    const nextBookmarks = movePinnedBookmark(bookmarks.value, id, direction)

    if (nextBookmarks === bookmarks.value) return { ok: true }

    bookmarks.value = normalizeDockOrder(nextBookmarks)
    if (!persist()) {
      bookmarks.value = previousBookmarks
      return { ok: false, reason: '排序保存失败：浏览器存储空间不足或不可用' }
    }

    return { ok: true }
  }

  const exportBookmarks = (): BookmarkExportData => {
    return createExportData(bookmarks.value, categoriesMeta.value)
  }

  const resetBookmarks = () => {
    bookmarks.value = parseBookmarks(DEFAULT_BOOKMARKS)
    categoriesMeta.value = createDefaultCategories()
    persist()
  }

  return {
    bookmarks,
    categories,
    draft,
    editingId,
    isModalOpen,
    openAddModal,
    openEditModal,
    closeModal,
    saveDraft,
    importBookmarks,
    removeBookmark,
    deleteCategory,
    unpinBookmark,
    reorderPinnedBookmarks,
    movePinnedBookmarkByDirection,
    exportBookmarks,
    resetBookmarks,
  }
}
