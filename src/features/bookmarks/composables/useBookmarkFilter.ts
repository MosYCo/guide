import { computed, ref, type Ref } from 'vue'
import { loadCollapsedCategories, saveCollapsedCategories } from '../storage'
import type { Bookmark } from '../types'
import { getHostname, groupBookmarks } from '../utils'

export type SearchScope = 'all' | 'title' | 'domain' | 'category' | 'tag'

const HISTORY_STORAGE_KEY = 'guide_search_history'

const loadSearchHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 8) : []
  } catch {
    return []
  }
}

const saveSearchHistory = (history: string[]) => {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  } catch {
    // Search history is non-critical.
  }
}

const fuzzyIncludes = (text: string, query: string) => {
  if (text.includes(query)) return true

  let queryIndex = 0
  for (const char of text) {
    if (char === query[queryIndex]) queryIndex += 1
    if (queryIndex === query.length) return true
  }

  return false
}

export const useBookmarkFilter = (bookmarks: Ref<Bookmark[]>) => {
  const query = ref('')
  const activeCategory = ref<string | null>(null)
  const searchScope = ref<SearchScope>('all')
  const searchCurrentCategoryOnly = ref(false)
  const searchHistory = ref<string[]>(loadSearchHistory())
  const collapsedCategories = ref<Record<string, boolean>>(loadCollapsedCategories())

  const filteredBookmarks = computed(() => {
    const normalizedQuery = query.value.trim().toLowerCase()
    let list = bookmarks.value

    if (activeCategory.value && (!searchCurrentCategoryOnly.value || !normalizedQuery)) {
      list = list.filter((bookmark) => bookmark.cat === activeCategory.value)
    }

    if (activeCategory.value && searchCurrentCategoryOnly.value) {
      list = list.filter((bookmark) => bookmark.cat === activeCategory.value)
    }

    if (normalizedQuery) {
      list = list.filter((bookmark) => {
        const fields = {
          title: bookmark.title,
          domain: getHostname(bookmark.url),
          category: bookmark.cat,
          tag: (bookmark.tags ?? []).join(' '),
        }

        if (searchScope.value === 'all') {
          return [...Object.values(fields), bookmark.url].some((value) => fuzzyIncludes(value.toLowerCase(), normalizedQuery))
        }

        return fuzzyIncludes(fields[searchScope.value].toLowerCase(), normalizedQuery)
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

  const commitSearch = () => {
    const value = query.value.trim()
    if (!value) return

    searchHistory.value = [value, ...searchHistory.value.filter((item) => item !== value)].slice(0, 8)
    saveSearchHistory(searchHistory.value)
  }

  const clearSearchHistory = () => {
    searchHistory.value = []
    saveSearchHistory(searchHistory.value)
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
    searchScope,
    searchCurrentCategoryOnly,
    searchHistory,
    collapsedCategories,
    filteredBookmarks,
    groupedBookmarks,
    setCategory,
    clearFilters,
    commitSearch,
    clearSearchHistory,
    toggleCategoryCollapsed,
  }
}
