import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useBookmarks } from '@/hooks/useBookmarks'
import { _resetDBForTesting, getDB } from '@/services/db'

describe('useBookmarks', () => {
  beforeEach(async () => {
    _resetDBForTesting()
    const db = await getDB()
    await db.clear('bookmarks')
    await db.clear('categories')
  })

  it('新增、访问、编辑、删除书签', async () => {
    const { result } = renderHook(() => useBookmarks())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let id = ''
    await act(async () => {
      const created = await result.current.addBookmark({
        url: 'https://example.com',
        name: 'Example',
      })
      id = created.id
    })
    expect(result.current.bookmarks).toHaveLength(1)
    expect(result.current.bookmarks[0].icon).toBe('')

    await act(async () => {
      await result.current.recordVisit(id)
    })
    expect(result.current.bookmarks[0].lastVisitedAt).not.toBeNull()

    await act(async () => {
      const updated = await result.current.updateBookmark(id, {
        url: 'https://example.com',
        name: 'Renamed',
      })
      expect(updated.name).toBe('Renamed')
    })
    expect(result.current.bookmarks[0].name).toBe('Renamed')

    await act(async () => {
      await result.current.deleteBookmark(id)
    })
    expect(result.current.bookmarks).toHaveLength(0)
  })

  it('编辑已删除书签会报错而不是复活', async () => {
    const { result } = renderHook(() => useBookmarks())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addBookmark({
        url: 'https://example.com',
        name: 'Gone',
      })
    })
    const id = result.current.bookmarks[0].id
    await act(async () => {
      await result.current.deleteBookmark(id)
    })

    await act(async () => {
      await expect(
        result.current.updateBookmark(id, {
          url: 'https://example.com',
          name: 'Back',
        }),
      ).rejects.toThrow('已被删除')
    })
  })
})
