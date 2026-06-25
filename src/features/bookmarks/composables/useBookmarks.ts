import { computed, ref } from 'vue'
import { CATEGORY_ORDER, DEFAULT_BOOKMARKS } from '../constants'
import { loadBookmarks, saveBookmarks } from '../storage'
import type { Bookmark, BookmarkDraft } from '../types'
import { createBookmarkId, normalizeUrl } from '../utils'

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
    saveBookmarks(bookmarks.value)
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

  const saveDraft = () => {
    const title = draft.value.title.trim()
    const url = normalizeUrl(draft.value.url)
    const cat = draft.value.cat.trim() || '未分类'

    if (!title || !url) return false

    if (editingId.value) {
      bookmarks.value = bookmarks.value.map((bookmark) =>
        bookmark.id === editingId.value
          ? {
              ...bookmark,
              title,
              url,
              cat,
              icon: draft.value.icon.trim(),
              pin: draft.value.pin,
            }
          : bookmark,
      )
    } else {
      bookmarks.value = [
        ...bookmarks.value,
        {
          id: createBookmarkId(),
          title,
          url,
          cat,
          icon: draft.value.icon.trim(),
          pin: draft.value.pin,
        },
      ]
    }

    persist()
    closeModal()
    return true
  }

  const removeBookmark = (id: string) => {
    bookmarks.value = bookmarks.value.filter((bookmark) => bookmark.id !== id)
    persist()
  }

  const resetBookmarks = () => {
    bookmarks.value = [...DEFAULT_BOOKMARKS]
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
    removeBookmark,
    resetBookmarks,
  }
}
