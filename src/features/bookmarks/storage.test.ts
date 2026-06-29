import { describe, expect, it } from 'vitest'
import { BOOKMARK_EXPORT_VERSION } from './constants'
import { createExportData, parseImportData } from './storage'
import type { Bookmark } from './types'
import { getPinnedBookmarks, normalizeDockOrder } from './utils'

const bookmarks: Bookmark[] = [
  {
    id: 'one',
    title: 'One',
    url: 'https://one.example/',
    cat: '开发',
    icon: '',
    faviconUrl: '',
    pin: true,
    dockOrder: 5,
    tags: ['one'],
  },
  {
    id: 'two',
    title: 'Two',
    url: 'https://two.example/',
    cat: '工具',
    icon: '',
    faviconUrl: '',
    pin: true,
    dockOrder: 1,
    tags: [],
  },
  {
    id: 'three',
    title: 'Three',
    url: 'https://three.example/',
    cat: '工具',
    icon: '',
    faviconUrl: '',
    pin: false,
    dockOrder: 3,
    tags: ['stale'],
  },
]

describe('bookmark storage helpers', () => {
  it('normalizes Dock order and removes stale order from unpinned bookmarks', () => {
    const normalized = normalizeDockOrder(bookmarks)

    expect(getPinnedBookmarks(normalized).map((bookmark) => bookmark.id)).toEqual(['two', 'one'])
    expect(normalized.find((bookmark) => bookmark.id === 'two')?.dockOrder).toBe(0)
    expect(normalized.find((bookmark) => bookmark.id === 'one')?.dockOrder).toBe(1)
    expect(normalized.find((bookmark) => bookmark.id === 'three')?.dockOrder).toBeUndefined()
  })

  it('parses legacy array imports and versioned exports', () => {
    const legacy = parseImportData(bookmarks)
    expect(legacy?.bookmarks).toHaveLength(3)
    expect(legacy?.categories).toEqual([])

    const exported = createExportData(bookmarks, [{ name: '工具', order: 3, hidden: false }])
    const parsed = parseImportData(exported)

    expect(exported.version).toBe(BOOKMARK_EXPORT_VERSION)
    expect(parsed?.bookmarks).toHaveLength(3)
    expect(parsed?.categories).toEqual([{ name: '工具', order: 3, hidden: false }])
    expect(parsed?.bookmarks[0].tags).toEqual(['one'])
  })
})
