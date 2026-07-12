import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BACKUP_STORAGE_KEY, BOOKMARK_STORAGE_KEY, SETTINGS_STORAGE_KEY, UNDO_STORAGE_KEY } from '../constants'
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
  {
    id: 'd',
    title: 'Alpha Copy',
    url: 'https://www.alpha.example/',
    cat: 'Other',
    icon: '',
    faviconUrl: '',
    pin: false,
    tags: ['solo'],
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

    const pinned = bookmarks.value
      .filter((bookmark) => bookmark.pin)
      .sort((a, b) => (a.dockOrder ?? 0) - (b.dockOrder ?? 0))
    expect(pinned.map((bookmark) => bookmark.id)).toEqual(['b', 'a'])
    expect(pinned.map((bookmark) => bookmark.dockOrder)).toEqual([0, 1])
  })

  it('renames categories and creates backups for bulk deletes', () => {
    const { bookmarks, backups, renameCategory, bulkDelete } = useBookmarks()

    expect(renameCategory('Temp', 'Renamed')).toEqual({ ok: true })
    expect(bookmarks.value.filter((bookmark) => bookmark.cat === 'Renamed')).toHaveLength(2)

    const result = bulkDelete(['a', 'b'])
    expect(result).toEqual({ ok: true, count: 2 })
    expect(bookmarks.value).toHaveLength(2)
    expect(backups.value.length).toBeGreaterThan(0)
  })

  it('records local visits without creating undo snapshots', () => {
    const { bookmarks, undoSnapshots, recordBookmarkVisit } = useBookmarks()

    const result = recordBookmarkVisit('a')

    expect(result.ok).toBe(true)
    expect(bookmarks.value.find((bookmark) => bookmark.id === 'a')?.visits).toBe(1)
    expect(bookmarks.value.find((bookmark) => bookmark.id === 'a')?.lastVisitedAt).toBeTruthy()
    expect(undoSnapshots.value).toHaveLength(0)
  })

  it('persists icon mode settings', () => {
    const { settings, setIconMode } = useBookmarks()

    expect(setIconMode('text')).toEqual({ ok: true })

    expect(settings.value.iconMode).toBe('text')
    expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}')).toEqual({
      iconMode: 'text',
    })
  })

  it('summarizes and applies cleanup actions', () => {
    const { bookmarks, cleanupSummary, deduplicateBookmarks, removeLowFrequencyTags } =
      useBookmarks()

    expect(cleanupSummary.value.duplicateGroups).toHaveLength(1)
    expect(cleanupSummary.value.lowFrequencyTags.map((tag) => tag.name)).toContain('solo')

    expect(deduplicateBookmarks()).toEqual({ ok: true, count: 1 })
    expect(bookmarks.value.some((bookmark) => bookmark.id === 'd')).toBe(false)

    expect(removeLowFrequencyTags()).toMatchObject({ ok: true })
    expect(bookmarks.value.flatMap((bookmark) => bookmark.tags ?? [])).not.toContain('read')
  })

  it('clears local backups and updates storage state', () => {
    const { backups, storageUsage, bulkDelete, clearBackups } = useBookmarks()

    expect(bulkDelete(['c'])).toEqual({ ok: true, count: 1 })
    const usedWithBackup = storageUsage.value.usedBytes
    expect(backups.value.length).toBeGreaterThan(0)

    expect(clearBackups()).toEqual({ ok: true, count: 1 })
    expect(backups.value).toHaveLength(0)
    expect(storageUsage.value.usedBytes).toBeLessThanOrEqual(usedWithBackup)
  })

  it('undoes bookmark mutations from the local undo stack', () => {
    const { bookmarks, undoSnapshots, toggleBookmarkPin, undoLastChange } = useBookmarks()

    expect(toggleBookmarkPin('c')).toMatchObject({ ok: true })
    expect(bookmarks.value.find((bookmark) => bookmark.id === 'c')?.pin).toBe(true)
    expect(undoSnapshots.value).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem(UNDO_STORAGE_KEY) ?? '[]')).toHaveLength(1)

    const result = undoLastChange()

    expect(result).toEqual({ ok: true, label: '切换 Dock 固定' })
    expect(bookmarks.value.find((bookmark) => bookmark.id === 'c')?.pin).toBe(false)
    expect(undoSnapshots.value).toHaveLength(0)
    expect(JSON.parse(localStorage.getItem(UNDO_STORAGE_KEY) ?? '[]')).toHaveLength(0)
  })

  it('imports JSON bookmarks with added/updated/skipped counts and a pre-import backup', () => {
    const { bookmarks, backups, importBookmarks } = useBookmarks()

    const result = importBookmarks(
      JSON.stringify([
        { ...seedBookmarks[0], title: 'Alpha Renamed' },
        seedBookmarks[2],
        {
          id: 'e',
          title: 'Delta',
          url: 'https://delta.example/',
          cat: 'Other',
          icon: '',
          faviconUrl: '',
          pin: false,
        },
      ]),
    )

    expect(result).toEqual({ ok: true, added: 1, updated: 1, skipped: 1 })
    expect(bookmarks.value.find((bookmark) => bookmark.id === 'a')?.title).toBe('Alpha Renamed')
    expect(bookmarks.value.some((bookmark) => bookmark.url === 'https://delta.example/')).toBe(true)
    expect(backups.value[0]?.label).toBe('导入前备份')
    expect(JSON.parse(localStorage.getItem(BACKUP_STORAGE_KEY) ?? '[]')).toHaveLength(1)
  })

  it('imports HTML bookmarks without clobbering pin state of existing entries', () => {
    const { bookmarks, importBookmarks } = useBookmarks()

    const result = importBookmarks(
      `<DL><p>
        <DT><H3>Imported</H3>
        <DL><p>
          <DT><A HREF="https://alpha.example/">Alpha From HTML</A>
          <DT><A HREF="https://new.example/">Brand New</A>
        </DL><p>
      </DL><p>`,
    )

    expect(result).toEqual({ ok: true, added: 1, updated: 1, skipped: 0 })
    const alpha = bookmarks.value.find((bookmark) => bookmark.url === 'https://alpha.example/')
    expect(alpha?.title).toBe('Alpha From HTML')
    expect(alpha?.pin).toBe(true)
  })

  it('rolls back memory state when persisting fails', () => {
    const { bookmarks, undoSnapshots, bulkDelete } = useBookmarks()
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })

    const result = bulkDelete(['a', 'b'])

    setItem.mockRestore()
    expect(result).toEqual({ ok: false, reason: '保存失败：浏览器存储空间不足或不可用' })
    expect(bookmarks.value).toHaveLength(4)
    expect(undoSnapshots.value).toHaveLength(0)
    expect(JSON.parse(localStorage.getItem(BOOKMARK_STORAGE_KEY) ?? '[]')).toHaveLength(4)
  })

  it('skips rewriting unchanged storage keys', () => {
    const { recordBookmarkVisit } = useBookmarks()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    expect(recordBookmarkVisit('a').ok).toBe(true)

    const writtenKeys = setItem.mock.calls.map(([key]) => key)
    setItem.mockRestore()
    expect(writtenKeys).toEqual([BOOKMARK_STORAGE_KEY])
  })
})
