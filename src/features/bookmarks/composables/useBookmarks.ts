import { computed, ref } from 'vue'
import { CATEGORY_ORDER, DEFAULT_BOOKMARKS } from '../constants'
import { loadBookmarks, parseBookmarks, saveBookmarks } from '../storage'
import type { Bookmark, BookmarkDraft, BookmarkImportResult } from '../types'
import { createBookmarkId, parseBookmarkUrl } from '../utils'

type BookmarkActionResult = { ok: true; bookmark: Bookmark } | { ok: false; reason: string }

const createDraft = (): BookmarkDraft => ({
  title: '',
  url: '',
  cat: Object.keys(CATEGORY_ORDER)[0],
  icon: '',
  pin: false,
})

export const useBookmarks = () => {
  const bookmarks = ref<Bookmark[]>(loadBookmarks())
  const editingId = ref<string | null>(null)
  const draft = ref<BookmarkDraft>(createDraft())
  const isModalOpen = ref(false)

  const categories = computed(() => {
    const names = new Set([...Object.keys(CATEGORY_ORDER), ...bookmarks.value.map((bookmark) => bookmark.cat)])
    return [...names].sort((a, b) => (CATEGORY_ORDER[a] ?? 99) - (CATEGORY_ORDER[b] ?? 99))
  })

  const persist = () => {
    return saveBookmarks(bookmarks.value)
  }

  const openAddModal = () => {
    editingId.value = null
    draft.value = createDraft()
    isModalOpen.value = true
  }

  const openEditModal = (bookmark: Bookmark) => {
    editingId.value = bookmark.id
    draft.value = {
      title: bookmark.title,
      url: bookmark.url,
      cat: bookmark.cat,
      icon: bookmark.icon,
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
    const cat = draft.value.cat.trim() || '未分类'

    if (!title) return { ok: false, reason: '名称不能为空' }
    if (!url) return { ok: false, reason: '请输入有效的 http 或 https 网址' }

    const duplicated = bookmarks.value.find((bookmark) => bookmark.url === url && bookmark.id !== editingId.value)
    if (duplicated) return { ok: false, reason: `已存在：${duplicated.title}` }

    if (editingId.value) {
      let updatedBookmark: Bookmark | undefined
      const previousBookmarks = bookmarks.value
      bookmarks.value = bookmarks.value.map((bookmark) =>
        bookmark.id === editingId.value
          ? (updatedBookmark = {
                ...bookmark,
                title,
                url,
                cat,
                icon: draft.value.icon.trim().slice(0, 8),
                pin: draft.value.pin,
              })
          : bookmark,
      )

      if (!updatedBookmark) return { ok: false, reason: '未找到要编辑的书签' }

      if (!persist()) {
        bookmarks.value = previousBookmarks
        return { ok: false, reason: '保存失败：浏览器存储空间不足或不可用' }
      }
      closeModal()
      return { ok: true, bookmark: updatedBookmark, created: false }
    } else {
      const previousBookmarks = bookmarks.value
      const bookmark = {
        id: createBookmarkId(),
        title,
        url,
        cat,
        icon: draft.value.icon.trim().slice(0, 8),
        pin: draft.value.pin,
      }
      bookmarks.value = [
        ...bookmarks.value,
        bookmark,
      ]
      if (!persist()) {
        bookmarks.value = previousBookmarks
        return { ok: false, reason: '保存失败：浏览器存储空间不足或不可用' }
      }
      closeModal()
      return { ok: true, bookmark, created: true }
    }
  }

  const importBookmarks = (raw: string): BookmarkImportResult | null => {
    try {
      const incoming = parseBookmarks(JSON.parse(raw))
      if (!incoming.length) return null

      const previousBookmarks = bookmarks.value
      const nextBookmarks = bookmarks.value.map((bookmark) => ({ ...bookmark }))
      const byUrl = new Map(nextBookmarks.map((bookmark) => [bookmark.url, bookmark]))
      const result: BookmarkImportResult = {
        added: 0,
        updated: 0,
        skipped: 0,
      }

      incoming.forEach((bookmark) => {
        const existing = byUrl.get(bookmark.url)
        if (!existing) {
          const nextBookmark = {
            ...bookmark,
            id: bookmarks.value.some((item) => item.id === bookmark.id) ? createBookmarkId() : bookmark.id,
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
          existing.pin !== bookmark.pin

        if (!hasChanges) {
          result.skipped += 1
          return
        }

        Object.assign(existing, {
          title: bookmark.title,
          cat: bookmark.cat,
          icon: bookmark.icon,
          pin: bookmark.pin,
        })
        result.updated += 1
      })

      bookmarks.value = nextBookmarks
      if (!persist()) {
        bookmarks.value = previousBookmarks
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

  const unpinBookmark = (id: string): BookmarkActionResult => {
    const previousBookmarks = bookmarks.value
    let updatedBookmark: Bookmark | undefined

    bookmarks.value = bookmarks.value.map((bookmark) =>
      bookmark.id === id ? (updatedBookmark = { ...bookmark, pin: false }) : bookmark,
    )

    if (!updatedBookmark) return { ok: false, reason: '未找到要移除的书签' }

    if (!persist()) {
      bookmarks.value = previousBookmarks
      return { ok: false, reason: '保存失败：浏览器存储空间不足或不可用' }
    }

    return { ok: true, bookmark: updatedBookmark }
  }

  const resetBookmarks = () => {
    bookmarks.value = parseBookmarks(DEFAULT_BOOKMARKS)
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
    unpinBookmark,
    resetBookmarks,
  }
}
