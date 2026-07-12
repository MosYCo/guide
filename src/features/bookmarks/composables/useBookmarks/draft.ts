import { ref } from 'vue'
import { CATEGORY_ORDER, UNCATEGORIZED_CATEGORY } from '../../constants'
import type { Bookmark, BookmarkDraft } from '../../types'
import { createBookmarkId, parseBookmarkUrl } from '../../utils'
import type { BookmarkStore } from './store'

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

export const createDraftActions = (store: BookmarkStore) => {
  const { bookmarks, categories, commit, upsertCategory, getNextDockOrder } = store

  const editingId = ref<string | null>(null)
  const draft = ref<BookmarkDraft>(createDraft())
  const isModalOpen = ref(false)

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
      const result = commit('编辑书签', () => {
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
      const result = commit('添加书签', () => {
        upsertCategory(cat)
        bookmarks.value = [...bookmarks.value, bookmark]
      })

      if (!result.ok) return result
      closeModal()
      return { ok: true, bookmark, created: true }
    }
  }

  return {
    draft,
    editingId,
    isModalOpen,
    openAddModal,
    openEditModal,
    closeModal,
    saveDraft,
  }
}
