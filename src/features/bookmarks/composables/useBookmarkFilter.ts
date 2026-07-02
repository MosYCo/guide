import { computed, ref, type Ref } from 'vue'
import { loadCollapsedCategories, saveCollapsedCategories } from '../storage'
import type { Bookmark, BookmarkSortMode } from '../types'
import { getHostname, groupBookmarks } from '../utils'

export type SearchScope = 'all' | 'title' | 'domain' | 'category' | 'tag'

const HISTORY_STORAGE_KEY = 'guide_search_history'

const loadSearchHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 8)
      : []
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

const getTime = (value?: string) => {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

const parseQuery = (query: string) => {
  const filters: Partial<Record<'title' | 'domain' | 'category' | 'tag' | 'url', string[]>> = {}
  const terms: string[] = []
  const tokens = query.match(/"[^"]+"|\S+/g) ?? []

  tokens.forEach((token) => {
    const cleaned = token.replace(/^"|"$/g, '').trim()
    const match = cleaned.match(/^([^:：]+)[:：](.+)$/)
    if (!match) {
      if (cleaned) terms.push(cleaned)
      return
    }

    const key = match[1].trim().toLowerCase()
    const value = match[2].trim()
    if (!value) return

    const field =
      key === 'title' || key === '标题'
        ? 'title'
        : key === 'domain' || key === 'host' || key === '域名'
          ? 'domain'
          : key === 'category' || key === 'cat' || key === '分类'
            ? 'category'
            : key === 'tag' || key === '标签'
              ? 'tag'
              : key === 'url' || key === '网址'
                ? 'url'
                : null

    if (!field) {
      terms.push(cleaned)
      return
    }

    filters[field] = [...(filters[field] ?? []), value]
  })

  return {
    filters,
    text: terms.join(' '),
  }
}

const matchesField = (value: string, queries?: string[]) => {
  if (!queries?.length) return true
  const normalizedValue = value.toLowerCase()
  return queries.every((query) => fuzzyIncludes(normalizedValue, query.toLowerCase()))
}

const getSortWeight = (bookmark: Bookmark) => {
  const visits = bookmark.visits ?? 0
  const lastVisitedAt = getTime(bookmark.lastVisitedAt)
  const recency = lastVisitedAt ? Math.max(0, 30 - (Date.now() - lastVisitedAt) / 86_400_000) : 0
  return visits * 8 + recency
}

const sortBookmarks = (bookmarks: Bookmark[], mode: BookmarkSortMode) => {
  if (mode === 'default') return bookmarks

  return [...bookmarks].sort((bookmarkA, bookmarkB) => {
    if (mode === 'smart') {
      const smartDiff = getSortWeight(bookmarkB) - getSortWeight(bookmarkA)
      if (smartDiff !== 0) return smartDiff
    }

    if (mode === 'recent') {
      const recentDiff = getTime(bookmarkB.lastVisitedAt) - getTime(bookmarkA.lastVisitedAt)
      if (recentDiff !== 0) return recentDiff
    }

    if (mode === 'frequent') {
      const frequentDiff = (bookmarkB.visits ?? 0) - (bookmarkA.visits ?? 0)
      if (frequentDiff !== 0) return frequentDiff
    }

    if (mode === 'stale') {
      const timeA = getTime(bookmarkA.lastVisitedAt)
      const timeB = getTime(bookmarkB.lastVisitedAt)
      if (timeA !== timeB) return timeA - timeB
      const visitDiff = (bookmarkA.visits ?? 0) - (bookmarkB.visits ?? 0)
      if (visitDiff !== 0) return visitDiff
    }

    return bookmarkA.title.localeCompare(bookmarkB.title)
  })
}

export const useBookmarkFilter = (bookmarks: Ref<Bookmark[]>) => {
  const query = ref('')
  const activeCategory = ref<string | null>(null)
  const activeTag = ref<string | null>(null)
  const searchScope = ref<SearchScope>('all')
  const searchCurrentCategoryOnly = ref(false)
  const sortMode = ref<BookmarkSortMode>('default')
  const searchHistory = ref<string[]>(loadSearchHistory())
  const collapsedCategories = ref<Record<string, boolean>>(loadCollapsedCategories())

  const filteredBookmarks = computed(() => {
    const normalizedQuery = query.value.trim().toLowerCase()
    const parsedQuery = parseQuery(query.value.trim())
    const textQuery = parsedQuery.text.toLowerCase()
    let list = bookmarks.value

    if (activeCategory.value && (!searchCurrentCategoryOnly.value || !normalizedQuery)) {
      list = list.filter((bookmark) => bookmark.cat === activeCategory.value)
    }

    if (activeTag.value) {
      list = list.filter((bookmark) => (bookmark.tags ?? []).includes(activeTag.value as string))
    }

    if (activeCategory.value && searchCurrentCategoryOnly.value) {
      list = list.filter((bookmark) => bookmark.cat === activeCategory.value)
    }

    if (Object.keys(parsedQuery.filters).length) {
      list = list.filter((bookmark) => {
        return (
          matchesField(bookmark.title, parsedQuery.filters.title) &&
          matchesField(getHostname(bookmark.url), parsedQuery.filters.domain) &&
          matchesField(bookmark.cat, parsedQuery.filters.category) &&
          matchesField((bookmark.tags ?? []).join(' '), parsedQuery.filters.tag) &&
          matchesField(bookmark.url, parsedQuery.filters.url)
        )
      })
    }

    if (textQuery) {
      list = list.filter((bookmark) => {
        const fields = {
          title: bookmark.title,
          domain: getHostname(bookmark.url),
          category: bookmark.cat,
          tag: (bookmark.tags ?? []).join(' '),
        }

        if (searchScope.value === 'all') {
          return [...Object.values(fields), bookmark.url].some((value) =>
            fuzzyIncludes(value.toLowerCase(), textQuery),
          )
        }

        return fuzzyIncludes(fields[searchScope.value].toLowerCase(), textQuery)
      })
    }

    return sortBookmarks(list, sortMode.value)
  })

  const groupedBookmarks = computed(() => groupBookmarks(filteredBookmarks.value))

  const setCategory = (category: string | null) => {
    activeCategory.value = category
  }

  const setTag = (tag: string | null) => {
    activeTag.value = tag
  }

  const clearFilters = () => {
    query.value = ''
    activeCategory.value = null
    activeTag.value = null
  }

  const commitSearch = () => {
    const value = query.value.trim()
    if (!value) return

    searchHistory.value = [value, ...searchHistory.value.filter((item) => item !== value)].slice(
      0,
      8,
    )
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
    activeTag,
    searchScope,
    searchCurrentCategoryOnly,
    sortMode,
    searchHistory,
    collapsedCategories,
    filteredBookmarks,
    groupedBookmarks,
    setCategory,
    setTag,
    clearFilters,
    commitSearch,
    clearSearchHistory,
    toggleCategoryCollapsed,
  }
}
