import { describe, expect, it } from 'vitest'
import { BOOKMARK_EXPORT_VERSION } from './constants'
import { createBookmarkHtml, createExportData, parseBookmarkHtml, parseImportData } from './storage'
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
    visits: 3,
    lastVisitedAt: '2026-06-01T00:00:00.000Z',
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
    expect(exported.settings?.iconMode).toBe('text')
    expect(parsed?.bookmarks).toHaveLength(3)
    expect(parsed?.categories).toEqual([{ name: '工具', order: 3, hidden: false }])
    expect(parsed?.settings?.iconMode).toBe('text')
    expect(parsed?.bookmarks[0].tags).toEqual(['one'])
    expect(parsed?.bookmarks[0].visits).toBe(3)
    expect(parsed?.bookmarks[0].lastVisitedAt).toBe('2026-06-01T00:00:00.000Z')
  })

  it('sanitizes exported settings', () => {
    const exported = createExportData(bookmarks, [], [], { iconMode: 'text' })
    const parsed = parseImportData(exported)

    expect(exported.settings?.iconMode).toBe('text')
    expect(parsed?.settings?.iconMode).toBe('text')
  })

  it('parses and creates browser bookmark HTML', () => {
    const html = createBookmarkHtml(bookmarks)
    const parsed = parseBookmarkHtml(html)

    expect(html).toContain('NETSCAPE-Bookmark-file-1')
    expect(html).toContain('TAGS="one"')
    expect(parsed.map((bookmark) => bookmark.url)).toContain('https://one.example/')
    expect(parsed.find((bookmark) => bookmark.url === 'https://one.example/')?.cat).toBe('开发')
    expect(parsed.find((bookmark) => bookmark.url === 'https://one.example/')?.tags).toEqual([
      'one',
    ])
  })
})
