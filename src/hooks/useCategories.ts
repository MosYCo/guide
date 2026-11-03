/**
 * useCategories Hook - 分类数据管理
 * FR-003 分类、FR-007 创建/重命名/删除
 * @see specs/001-bookmark-navigation/contracts/ui-contract.md §useCategories
 */

import { useCallback, useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Category } from '@/types'
import {
  addCategory,
  countCategoryByName,
  deleteCategory as dbDeleteCategory,
  getAllCategories,
  getMaxCategoryOrder,
  putCategory,
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

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    try {
      if (!silent) setLoading(true)
      const all = await getAllCategories()
      setCategories(all)
      setError(null)
      return true
    } catch (e) {
      setError(e as Error)
      return false
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // FR-007: 创建分类（名称唯一性校验）
  const addCategoryFn = useCallback(
    async (name: string): Promise<Category> => {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('分类名称不能为空')
      if (trimmed.length > 50) throw new Error('分类名称不能超过 50 字符')
      // 同层级唯一性
      if ((await countCategoryByName(trimmed)) > 0) {
        throw new Error(`分类「${trimmed}」已存在`)
      }
      const order = (await getMaxCategoryOrder()) + 1
      const category: Category = {
        id: uuidv4(),
        name: trimmed,
        order,
        createdAt: new Date().toISOString(),
      }
      await addCategory(category)
      setCategories((prev) => [...prev, category].sort((a, b) => a.order - b.order))
      return category
    },
    [],
  )

  // FR-007: 重命名分类（独立方法，名称唯一性校验）
  const renameCategoryFn = useCallback(
    async (id: string, name: string): Promise<Category> => {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('分类名称不能为空')
      if (trimmed.length > 50) throw new Error('分类名称不能超过 50 字符')
      const existing = categories.find((c) => c.id === id)
      if (!existing) throw new Error('分类不存在')
      // 若名称未变，直接返回
      if (existing.name === trimmed) return existing
      // 唯一性校验（排除自身）
      if ((await countCategoryByName(trimmed)) > 0) {
        throw new Error(`分类「${trimmed}」已存在`)
      }
      const updated: Category = { ...existing, name: trimmed }
      await putCategory(updated)
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.order - b.order),
      )
      return updated
    },
    [categories],
  )

  // FR-007: 删除分类（独立方法，级联置空书签 categoryId，需调用方确认）
  const deleteCategoryFn = useCallback(
    async (id: string): Promise<void> => {
      await dbDeleteCategory(id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
    },
    [],
  )

  // 重排序分类
  const reorderCategoriesFn = useCallback(
    async (ids: string[]): Promise<void> => {
      const updated = categories
        .map((c) => {
          const newOrder = ids.indexOf(c.id)
          return newOrder === -1 ? c : { ...c, order: newOrder }
        })
        .sort((a, b) => a.order - b.order)
      // 持久化新顺序
      for (const c of updated) {
        await putCategory(c)
      }
      setCategories(updated)
    },
    [categories],
  )

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
