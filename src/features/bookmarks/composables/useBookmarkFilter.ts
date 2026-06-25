import { computed, ref, type Ref } from 'vue'
import { loadCollapsedCategories, saveCollapsedCategories } from '../storage'
import type { Bookmark } from '../types'
import { getHostname, groupBookmarks } from '../utils'

export const useBookmarkFilter = (bookmarks: Ref<Bookmark[]>) => {
  const query = ref('')
  const activeCategory = ref<string | null>(null)
  const collapsedCategories = ref<Record<string, boolean>>(loadCollapsedCategories())

  const filteredBookmarks = computed(() => {
    const normalizedQuery = query.value.trim().toLowerCase()
    let list = bookmarks.value

    if (activeCategory.value) {
      list = list.filter((bookmark) => bookmark.cat === activeCategory.value)
    }

    if (normalizedQuery) {
      list = list.filter((bookmark) => {
        return (
          bookmark.title.toLowerCase().includes(normalizedQuery) ||
          bookmark.url.toLowerCase().includes(normalizedQuery) ||
          bookmark.cat.toLowerCase().includes(normalizedQuery) ||
          getHostname(bookmark.url).toLowerCase().includes(normalizedQuery)
        )
      })
    }

    return list
  })

  const groupedBookmarks = computed(() => groupBookmarks(filteredBookmarks.value))

  const setCategory = (category: string | null) => {
    activeCategory.value = category
  }

  const clearFilters = () => {
    query.value = ''
    activeCategory.value = null
  }

  const toggleCategoryCollapsed = (category: string) => {
    collapsedCategories.value = {
      ...collapsedCategories.value,
      [category]: !collapsedCategories.value[category],
    }
    saveCollapsedCategories(collapsedCategories.value)
  }

  return {
    query,
    activeCategory,
    collapsedCategories,
    filteredBookmarks,
    groupedBookmarks,
    setCategory,
    clearFilters,
    toggleCategoryCollapsed,
  }
}
