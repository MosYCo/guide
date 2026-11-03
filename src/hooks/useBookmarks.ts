/**
 * useBookmarks Hook - 书签数据管理
 * FR-001 添加、FR-004 持久化、FR-010 启动加载、FR-012 搜索、FR-017 最近访问
 * @see specs/001-bookmark-navigation/contracts/ui-contract.md §useBookmarks
 */

import { useCallback, useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Bookmark, BookmarkFormData } from '@/types'
import {
  addBookmark,
  categoryExists,
  deleteBookmark,
  getAllBookmarks,
  getRecentBookmarks,
  putBookmark,
  updateLastVisited,
} from '@/services/db'
import { resolveIcon } from '@/services/favicon'
import { validateAndNormalizeUrl } from '@/utils/url'

export interface UseBookmarksReturn {
  bookmarks: Bookmark[]
  loading: boolean
  error: Error | null
  addBookmark: (data: BookmarkFormData) => Promise<Bookmark>
  updateBookmark: (id: string, data: BookmarkFormData) => Promise<Bookmark>
  deleteBookmark: (id: string) => Promise<void>
  searchBookmarks: (query: string) => Bookmark[]
  getRecentBookmarks: (limit?: number) => Bookmark[]
  recordVisit: (id: string) => Promise<void>
  refresh: (options?: { silent?: boolean }) => Promise<boolean>
  moveBookmarkToCategory: (id: string, categoryId: string | null) => Promise<void>
}

export function useBookmarks(): UseBookmarksReturn {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    try {
      if (!silent) setLoading(true)
      const all = await getAllBookmarks()
      setBookmarks(all)
      setError(null)
      return true
    } catch (e) {
      setError(e as Error)
      return false
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // FR-010: 应用启动时从 IndexedDB 读取所有数据
  useEffect(() => {
    refresh()
  }, [refresh])

  const addBookmarkFn = useCallback(
    async (data: BookmarkFormData): Promise<Bookmark> => {
      // FR-002: URL 验证（http/https 白名单）
      const validation = validateAndNormalizeUrl(data.url)
      if (!validation.valid) {
        throw new Error(validation.error ?? 'URL 无效')
      }
      const now = new Date().toISOString()
      // FR-008: 图标自动解析（用户未提供则 Favicon API + 首字母降级）
      const icon = resolveIcon(validation.normalized!, data.name, data.icon)
      const bookmark: Bookmark = {
        id: uuidv4(),
        url: validation.normalized!,
        name: data.name.trim(),
        icon,
        categoryId: data.categoryId ?? null,
        createdAt: now,
        lastVisitedAt: null,
      }
      await addBookmark(bookmark)
      setBookmarks((prev) => [bookmark, ...prev])
      return bookmark
    },
    [],
  )

  const updateBookmarkFn = useCallback(
    async (id: string, data: BookmarkFormData): Promise<Bookmark> => {
      const validation = validateAndNormalizeUrl(data.url)
      if (!validation.valid) {
        throw new Error(validation.error ?? 'URL 无效')
      }
      const existing = bookmarks.find((b) => b.id === id)
      if (!existing) throw new Error('书签不存在')
      const requestedCategoryId = data.categoryId ?? null
      // 多标签/并发删除后,不要把已不存在的分类 ID 写回
      const categoryId =
        requestedCategoryId && (await categoryExists(requestedCategoryId))
          ? requestedCategoryId
          : null
      const icon = resolveIcon(validation.normalized!, data.name, data.icon)
      const updated: Bookmark = {
        ...existing,
        url: validation.normalized!,
        name: data.name.trim(),
        icon,
        categoryId,
      }
      await putBookmark(updated)
      setBookmarks((prev) => prev.map((b) => (b.id === id ? updated : b)))
      return updated
    },
    [bookmarks],
  )

  const deleteBookmarkFn = useCallback(
    async (id: string): Promise<void> => {
      await deleteBookmark(id)
      setBookmarks((prev) => prev.filter((b) => b.id !== id))
    },
    [],
  )

  // FR-012: 按名称和 URL 实时搜索（不区分大小写）
  const searchBookmarks = useCallback(
    (query: string): Bookmark[] => {
      const q = query.trim().toLowerCase()
      if (!q) return bookmarks
      return bookmarks.filter(
        (b) =>
          b.name.toLowerCase().includes(q) || b.url.toLowerCase().includes(q),
      )
    },
    [bookmarks],
  )

  // FR-017: 最近访问的书签
  const getRecent = useCallback(
    (limit = 10): Bookmark[] => {
      return bookmarks
        .filter((b) => b.lastVisitedAt !== null)
        .sort((a, b) =>
          (a.lastVisitedAt ?? '') < (b.lastVisitedAt ?? '') ? 1 : -1,
        )
        .slice(0, limit)
    },
    [bookmarks],
  )

  const recordVisitFn = useCallback(
    async (id: string): Promise<void> => {
      const now = new Date().toISOString()
      await updateLastVisited(id, now)
      setBookmarks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, lastVisitedAt: now } : b)),
      )
    },
    [],
  )

  return {
    bookmarks,
    loading,
    error,
    addBookmark: addBookmarkFn,
    updateBookmark: updateBookmarkFn,
    deleteBookmark: deleteBookmarkFn,
    searchBookmarks,
    getRecentBookmarks: getRecent,
    recordVisit: recordVisitFn,
    refresh,
    moveBookmarkToCategory: useCallback(
      async (id: string, categoryId: string | null): Promise<void> => {
        const existing = bookmarks.find((b) => b.id === id)
        if (!existing) throw new Error('书签不存在')
        const resolvedCategoryId =
          categoryId && (await categoryExists(categoryId)) ? categoryId : null
        const updated = { ...existing, categoryId: resolvedCategoryId }
        await putBookmark(updated)
        setBookmarks((prev) => prev.map((b) => (b.id === id ? updated : b)))
      },
      [bookmarks],
    ),
  }
}

// 重新导出 getRecentBookmarks 以满足契约（直接读 DB 的版本）
export { getRecentBookmarks as getRecentBookmarksFromDB }
