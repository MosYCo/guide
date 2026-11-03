/**
 * useBookmarks Hook - 书签数据管理
 * 添加、持久化、启动加载、搜索、最近访问
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Bookmark, BookmarkFormData } from '@/types'
import {
  addBookmarkWithValidCategory,
  deleteBookmark,
  getAllBookmarks,
  updateBookmarkFields,
  updateLastVisited,
} from '@/services/db'
import { validateAndNormalizeUrl } from '@/utils/url'

export interface UseBookmarksReturn {
  bookmarks: Bookmark[]
  loading: boolean
  error: Error | null
  addBookmark: (data: BookmarkFormData) => Promise<Bookmark>
  updateBookmark: (id: string, data: BookmarkFormData) => Promise<Bookmark>
  deleteBookmark: (id: string) => Promise<void>
  getRecentBookmarks: (limit?: number) => Bookmark[]
  recordVisit: (id: string) => Promise<void>
  refresh: (options?: { silent?: boolean }) => Promise<boolean>
  moveBookmarkToCategory: (id: string, categoryId: string | null) => Promise<void>
}

export function useBookmarks(): UseBookmarksReturn {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const requestIdRef = useRef(0)

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    const requestId = ++requestIdRef.current
    try {
      if (!silent) setLoading(true)
      const all = await getAllBookmarks()
      if (requestId !== requestIdRef.current) return true
      setBookmarks(all)
      setError(null)
      return true
    } catch (e) {
      if (requestId !== requestIdRef.current) return true
      setError(e as Error)
      return false
    } finally {
      if (!silent && requestId === requestIdRef.current) setLoading(false)
    }
  }, [])

  // 应用启动时从 IndexedDB 读取所有数据
  useEffect(() => {
    void refresh()
  }, [refresh])

  const addBookmarkFn = useCallback(async (data: BookmarkFormData): Promise<Bookmark> => {
    // URL 验证（http/https 白名单）
    const validation = validateAndNormalizeUrl(data.url)
    if (!validation.valid) {
      throw new Error(validation.error ?? 'URL 无效')
    }
    const now = new Date().toISOString()
    // 只持久化用户提供的图标;远程 favicon 在展示时解析,便于换源/禁用外部请求
    const icon = data.icon?.trim() || ''
    const bookmark: Bookmark = {
      id: uuidv4(),
      url: validation.normalized!,
      name: data.name.trim(),
      icon,
      categoryId: data.categoryId ?? null,
      createdAt: now,
      lastVisitedAt: null,
    }
    const saved = await addBookmarkWithValidCategory(bookmark)
    setBookmarks((prev) => [saved, ...prev])
    return saved
  }, [])

  const updateBookmarkFn = useCallback(
    async (id: string, data: BookmarkFormData): Promise<Bookmark> => {
      const validation = validateAndNormalizeUrl(data.url)
      if (!validation.valid) {
        throw new Error(validation.error ?? 'URL 无效')
      }
      // 只覆盖可编辑字段;当前记录从事务内读取,避免旧快照覆盖 lastVisitedAt 或复活已删书签
      const updated = await updateBookmarkFields(id, {
        url: validation.normalized!,
        name: data.name.trim(),
        icon: data.icon?.trim() || '',
        categoryId: data.categoryId ?? null,
      })
      setBookmarks((prev) => prev.map((b) => (b.id === id ? updated : b)))
      return updated
    },
    [],
  )

  const deleteBookmarkFn = useCallback(async (id: string): Promise<void> => {
    await deleteBookmark(id)
    setBookmarks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  // 最近访问的书签
  const getRecent = useCallback(
    (limit = 10): Bookmark[] => {
      return bookmarks
        .filter((b) => b.lastVisitedAt !== null)
        .sort((a, b) => {
          const byDate = (b.lastVisitedAt ?? '').localeCompare(a.lastVisitedAt ?? '')
          return byDate !== 0 ? byDate : a.id.localeCompare(b.id)
        })
        .slice(0, limit)
    },
    [bookmarks],
  )

  const recordVisitFn = useCallback(async (id: string): Promise<void> => {
    const now = new Date().toISOString()
    await updateLastVisited(id, now)
    setBookmarks((prev) => prev.map((b) => (b.id === id ? { ...b, lastVisitedAt: now } : b)))
  }, [])

  return {
    bookmarks,
    loading,
    error,
    addBookmark: addBookmarkFn,
    updateBookmark: updateBookmarkFn,
    deleteBookmark: deleteBookmarkFn,
    getRecentBookmarks: getRecent,
    recordVisit: recordVisitFn,
    refresh,
    moveBookmarkToCategory: useCallback(
      async (id: string, categoryId: string | null): Promise<void> => {
        const updated = await updateBookmarkFields(id, { categoryId })
        setBookmarks((prev) => prev.map((b) => (b.id === id ? updated : b)))
      },
      [],
    ),
  }
}
