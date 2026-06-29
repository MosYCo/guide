import { beforeEach, describe, expect, it } from 'vitest'
import { BOOKMARK_STORAGE_KEY } from '../constants'
import type { Bookmark } from '../types'
import { useBookmarks } from './useBookmarks'

const seedBookmarks: Bookmark[] = [
  {
    id: 'a',
    title: 'Alpha',
    url: 'https://alpha.example/',
    cat: 'Temp',
    icon: '',
    faviconUrl: '',
    pin: true,
    tags: ['work'],
  },
  {
    id: 'b',
    title: 'Beta',
    url: 'https://beta.example/',
    cat: 'Temp',
    icon: '',
    faviconUrl: '',
    pin: true,
    tags: [],
  },
  {
    id: 'c',
    title: 'Gamma',
    url: 'https://gamma.example/',
    cat: 'Other',
    icon: '',
    faviconUrl: '',
    pin: false,
    tags: ['read'],
  },
]

describe('useBookmarks', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(seedBookmarks))
  })

  it('moves bookmarks to uncategorized when deleting a category', () => {
    const { bookmarks, categories, deleteCategory } = useBookmarks()

    const result = deleteCategory('Temp')

    expect(result).toEqual({ ok: true, moved: 2 })
    expect(bookmarks.value.filter((bookmark) => bookmark.cat === '未分类')).toHaveLength(2)
    expect(categories.value).not.toContain('Temp')
  })

  it('persists directional Dock reorder with normalized order', () => {
    const { bookmarks, movePinnedBookmarkByDirection } = useBookmarks()

    movePinnedBookmarkByDirection('b', 'left')

    const pinned = bookmarks.value.filter((bookmark) => bookmark.pin).sort((a, b) => (a.dockOrder ?? 0) - (b.dockOrder ?? 0))
    expect(pinned.map((bookmark) => bookmark.id)).toEqual(['b', 'a'])
    expect(pinned.map((bookmark) => bookmark.dockOrder)).toEqual([0, 1])
  })

  it('renames categories and creates backups for bulk deletes', () => {
    const { bookmarks, backups, renameCategory, bulkDelete } = useBookmarks()

    expect(renameCategory('Temp', 'Renamed')).toEqual({ ok: true })
    expect(bookmarks.value.filter((bookmark) => bookmark.cat === 'Renamed')).toHaveLength(2)

    const result = bulkDelete(['a', 'b'])
    expect(result).toEqual({ ok: true, count: 2 })
    expect(bookmarks.value).toHaveLength(1)
    expect(backups.value.length).toBeGreaterThan(0)
  })
})
