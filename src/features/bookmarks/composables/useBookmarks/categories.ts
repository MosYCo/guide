import { UNCATEGORIZED_CATEGORY } from '../../constants'
import type { DockMoveDirection, MutationResult } from '../../types'
import { sortCategories } from '../../utils'
import type { BookmarkStore } from './store'

export type CategoryDeleteResult = { ok: true; moved: number } | { ok: false; reason: string }

export const createCategoryActions = (store: BookmarkStore) => {
  const { bookmarks, categoriesMeta, commit, upsertCategory } = store

  const deleteCategory = (category: string): CategoryDeleteResult => {
    const normalizedCategory = category.trim()

    if (!normalizedCategory) return { ok: false, reason: '分类名称无效' }
    if (normalizedCategory === UNCATEGORIZED_CATEGORY)
      return { ok: false, reason: '未分类不能删除' }

    const moved = bookmarks.value.filter((bookmark) => bookmark.cat === normalizedCategory).length

    const result = commit(
      '删除分类',
      () => {
        bookmarks.value = bookmarks.value.map((bookmark) =>
          bookmark.cat === normalizedCategory
            ? { ...bookmark, cat: UNCATEGORIZED_CATEGORY }
            : bookmark,
        )
        upsertCategory(normalizedCategory, true)
      },
      { backup: true },
    )

    return result.ok ? { ok: true, moved } : result
  }

  const renameCategory = (from: string, to: string): MutationResult => {
    const source = from.trim()
    const target = to.trim()
    if (!source || !target) return { ok: false, reason: '分类名称不能为空' }
    if (source === UNCATEGORIZED_CATEGORY) return { ok: false, reason: '未分类不能重命名' }
    if (source === target) return { ok: true }

    return commit(
      '重命名分类',
      () => {
        bookmarks.value = bookmarks.value.map((bookmark) =>
          bookmark.cat === source ? { ...bookmark, cat: target } : bookmark,
        )
        categoriesMeta.value = categoriesMeta.value
          .filter((category) => category.name !== target)
          .map((category) =>
            category.name === source ? { ...category, name: target, hidden: false } : category,
          )
        upsertCategory(target)
      },
      { backup: true },
    )
  }

  const mergeCategory = (from: string, to: string): MutationResult => {
    const source = from.trim()
    const target = to.trim()
    if (!source || !target) return { ok: false, reason: '分类名称不能为空' }
    if (source === target) return { ok: true }

    return commit(
      '合并分类',
      () => {
        bookmarks.value = bookmarks.value.map((bookmark) =>
          bookmark.cat === source ? { ...bookmark, cat: target } : bookmark,
        )
        categoriesMeta.value = categoriesMeta.value.map((category) =>
          category.name === source ? { ...category, hidden: true } : category,
        )
        upsertCategory(target)
      },
      { backup: true },
    )
  }

  const moveCategory = (category: string, direction: DockMoveDirection): MutationResult => {
    const sorted = sortCategories(categoriesMeta.value)
    const index = sorted.findIndex((item) => item.name === category)
    const targetIndex = direction === 'left' ? index - 1 : index + 1
    if (index === -1 || targetIndex < 0 || targetIndex >= sorted.length) return { ok: true }

    return commit(
      '调整分类排序',
      () => {
        const currentOrder = sorted[index].order
        const targetOrder = sorted[targetIndex].order
        categoriesMeta.value = sorted.map((item, itemIndex) =>
          itemIndex === index
            ? { ...item, order: targetOrder }
            : itemIndex === targetIndex
              ? { ...item, order: currentOrder }
              : item,
        )
      },
      { backup: true },
    )
  }

  const setCategoryHidden = (category: string, hidden: boolean): MutationResult => {
    if (category === UNCATEGORIZED_CATEGORY && hidden)
      return { ok: false, reason: '未分类不能隐藏' }

    return commit(
      hidden ? '隐藏分类' : '恢复分类',
      () => {
        upsertCategory(category, hidden)
      },
      { backup: true },
    )
  }

  return {
    deleteCategory,
    renameCategory,
    mergeCategory,
    moveCategory,
    setCategoryHidden,
  }
}
