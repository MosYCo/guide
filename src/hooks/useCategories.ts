/**
 * useCategories Hook - 分类数据管理
 * 分类、创建/重命名/删除
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Category } from '@/types'
import {
  createCategoryWithUniqueName,
  deleteCategory as dbDeleteCategory,
  getAllCategories,
  renameCategoryWithUniqueName,
  reorderCategoriesInDb,
} from '@/services/db'

export interface UseCategoriesReturn {
  categories: Category[]
  loading: boolean
  error: Error | null
  addCategory: (name: string) => Promise<Category>
  renameCategory: (id: string, name: string) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
  reorderCategories: (ids: string[]) => Promise<void>
  refresh: (options?: { silent?: boolean }) => Promise<boolean>
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const requestIdRef = useRef(0)

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    const requestId = ++requestIdRef.current
    try {
      if (!silent) setLoading(true)
      const all = await getAllCategories()
      if (requestId !== requestIdRef.current) return true
      setCategories(all)
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

  useEffect(() => {
    void refresh()
  }, [refresh])

  // 创建分类（名称唯一性校验）
  const addCategoryFn = useCallback(async (name: string): Promise<Category> => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('分类名称不能为空')
    if (trimmed.length > 50) throw new Error('分类名称不能超过 50 字符')
    const category = await createCategoryWithUniqueName({
      id: uuidv4(),
      name: trimmed,
      createdAt: new Date().toISOString(),
    })
    setCategories((prev) => [...prev, category].sort((a, b) => a.order - b.order))
    return category
  }, [])

  // 重命名分类（独立方法，名称唯一性校验）
  const renameCategoryFn = useCallback(
    async (id: string, name: string): Promise<Category> => {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('分类名称不能为空')
      if (trimmed.length > 50) throw new Error('分类名称不能超过 50 字符')
      const existing = categories.find((c) => c.id === id)
      if (!existing) throw new Error('分类不存在')
      if (existing.name === trimmed) return existing
      const updated = await renameCategoryWithUniqueName(id, trimmed)
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.order - b.order),
      )
      return updated
    },
    [categories],
  )

  // 删除分类（独立方法，级联置空书签 categoryId，需调用方确认）
  const deleteCategoryFn = useCallback(async (id: string): Promise<void> => {
    await dbDeleteCategory(id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }, [])

  // 重排序分类
  const reorderCategoriesFn = useCallback(async (ids: string[]): Promise<void> => {
    const updated = await reorderCategoriesInDb(ids)
    setCategories(updated)
  }, [])

  return {
    categories,
    loading,
    error,
    addCategory: addCategoryFn,
    renameCategory: renameCategoryFn,
    deleteCategory: deleteCategoryFn,
    reorderCategories: reorderCategoriesFn,
    refresh,
  }
}
