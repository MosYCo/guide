import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import type { Bookmark } from '../types'
import { fuzzyIncludes, parseQuery, sortBookmarks, useBookmarkFilter } from './useBookmarkFilter'

const makeBookmark = (overrides: Partial<Bookmark> & { id: string }): Bookmark => ({
  title: overrides.id,
  url: `https://${overrides.id}.example/`,
  cat: '开发',
  icon: '',
  faviconUrl: '',
  pin: false,
  ...overrides,
})

describe('parseQuery', () => {
  it('splits plain terms from field filters', () => {
    expect(parseQuery('vue domain:github tag:code')).toEqual({
      filters: { domain: ['github'], tag: ['code'] },
      text: 'vue',
    })
  })

  it('supports chinese field names and full-width colons', () => {
    expect(parseQuery('域名：github 标签:工作')).toEqual({
      filters: { domain: ['github'], tag: ['工作'] },
      text: '',
    })
  })

  it('keeps quoted phrases and unknown fields as plain terms', () => {
    expect(parseQuery('"hello world" foo:bar')).toEqual({
      filters: {},
      text: 'hello world foo:bar',
    })
  })

  it('collects repeated filters for the same field', () => {
    expect(parseQuery('domain:git domain:hub').filters.domain).toEqual(['git', 'hub'])
  })
})

describe('fuzzyIncludes', () => {
  it('matches substrings and in-order subsequences', () => {
    expect(fuzzyIncludes('github.com', 'hub')).toBe(true)
    expect(fuzzyIncludes('github.com', 'gtc')).toBe(true)
  })

  it('rejects out-of-order sequences', () => {
    expect(fuzzyIncludes('github.com', 'moc.buh')).toBe(false)
  })
})

describe('sortBookmarks', () => {
  const now = Date.now()
  const bookmarks: Bookmark[] = [
    makeBookmark({ id: 'old', visits: 1, lastVisitedAt: new Date(now - 90 * 86_400_000).toISOString() }),
    makeBookmark({ id: 'hot', visits: 30, lastVisitedAt: new Date(now - 86_400_000).toISOString() }),
    makeBookmark({ id: 'never' }),
  ]

  it('returns the same array untouched in default mode', () => {
    expect(sortBookmarks(bookmarks, 'default')).toBe(bookmarks)
  })

  it('sorts by recency in recent mode', () => {
    expect(sortBookmarks(bookmarks, 'recent').map((bookmark) => bookmark.id)).toEqual([
      'hot',
      'old',
      'never',
    ])
  })

  it('sorts by visit count in frequent mode', () => {
    expect(sortBookmarks(bookmarks, 'frequent').map((bookmark) => bookmark.id)).toEqual([
      'hot',
      'old',
      'never',
    ])
  })

  it('sorts least recently used first in stale mode', () => {
    expect(sortBookmarks(bookmarks, 'stale').map((bookmark) => bookmark.id)).toEqual([
      'never',
      'old',
      'hot',
    ])
  })

  it('ranks visited-and-recent bookmarks first in smart mode', () => {
    expect(sortBookmarks(bookmarks, 'smart')[0].id).toBe('hot')
  })
})

describe('useBookmarkFilter', () => {
  const bookmarks = ref<Bookmark[]>([
    makeBookmark({ id: 'gh', title: 'GitHub', url: 'https://github.com/', cat: '开发', tags: ['code'] }),
    makeBookmark({ id: 'so', title: 'Stack Overflow', url: 'https://stackoverflow.com/', cat: '开发' }),
    makeBookmark({ id: 'fig', title: 'Figma', url: 'https://figma.com/', cat: '设计', tags: ['ui'] }),
  ])

  type Filter = ReturnType<typeof useBookmarkFilter>

  const mountFilter = () => {
    let filter!: Filter
    const wrapper = mount(
      defineComponent({
        setup() {
          filter = useBookmarkFilter(bookmarks)
          return () => null
        },
      }),
    )
    return { filter, wrapper }
  }

  const search = async (filter: Filter, value: string) => {
    filter.query.value = value
    await nextTick()
    vi.advanceTimersByTime(100)
    await nextTick()
  }

  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('filters by category and tag', () => {
    const { filter } = mountFilter()

    filter.setCategory('开发')
    expect(filter.filteredBookmarks.value.map((bookmark) => bookmark.id)).toEqual(['gh', 'so'])

    filter.setTag('code')
    expect(filter.filteredBookmarks.value.map((bookmark) => bookmark.id)).toEqual(['gh'])

    filter.clearFilters()
    expect(filter.filteredBookmarks.value).toHaveLength(3)
  })

  it('debounces text search across all fields', async () => {
    const { filter } = mountFilter()

    filter.query.value = 'figma'
    await nextTick()
    expect(filter.filteredBookmarks.value).toHaveLength(3)

    vi.advanceTimersByTime(100)
    await nextTick()
    expect(filter.filteredBookmarks.value.map((bookmark) => bookmark.id)).toEqual(['fig'])
  })

  it('applies field queries like domain:', async () => {
    const { filter } = mountFilter()

    await search(filter, 'domain:github')
    expect(filter.filteredBookmarks.value.map((bookmark) => bookmark.id)).toEqual(['gh'])

    await search(filter, 'tag:ui')
    expect(filter.filteredBookmarks.value.map((bookmark) => bookmark.id)).toEqual(['fig'])
  })

  it('restricts text search to the selected scope', async () => {
    const { filter } = mountFilter()

    filter.searchScope.value = 'title'
    await search(filter, 'github')
    expect(filter.filteredBookmarks.value.map((bookmark) => bookmark.id)).toEqual(['gh'])

    await search(filter, 'stackoverflow.com')
    expect(filter.filteredBookmarks.value).toHaveLength(0)
  })

  it('groups filtered bookmarks by category', () => {
    const { filter } = mountFilter()

    const groups = filter.groupedBookmarks.value
    expect(groups.map((group) => group.name)).toEqual(['开发', '设计'])
    expect(groups[0].items).toHaveLength(2)
  })

  it('records committed searches into a deduplicated history', () => {
    const { filter } = mountFilter()

    filter.query.value = 'vue'
    filter.commitSearch()
    filter.query.value = 'vite'
    filter.commitSearch()
    filter.query.value = 'vue'
    filter.commitSearch()

    expect(filter.searchHistory.value).toEqual(['vue', 'vite'])
    expect(JSON.parse(localStorage.getItem('guide_search_history') ?? '[]')).toEqual([
      'vue',
      'vite',
    ])

    filter.clearSearchHistory()
    expect(filter.searchHistory.value).toEqual([])
  })
})
