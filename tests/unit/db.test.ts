import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import {
  getDB,
  _resetDBForTesting,
  getAllBookmarks,
  addBookmark,
  putBookmark,
  deleteBookmark,
  countByUrl,
  getRecentBookmarks,
  updateLastVisited,
  getAllCategories,
  addCategory,
  putCategory,
  deleteCategory,
  countCategoryByName,
  getMaxCategoryOrder,
  bulkAddBookmarks,
  bulkAddCategories,
  bulkImport,
} from '@/services/db'
import type { Bookmark, Category } from '@/types'

function makeBookmark(over: Partial<Bookmark> = {}): Bookmark {
  return {
    id: crypto.randomUUID(),
    url: 'https://example.com',
    name: 'Example',
    icon: 'https://icon.example.com',
    categoryId: null,
    createdAt: new Date().toISOString(),
    lastVisitedAt: null,
    ...over,
  }
}

function makeCategory(over: Partial<Category> = {}): Category {
  return {
    id: crypto.randomUUID(),
    name: 'Test',
    order: 0,
    createdAt: new Date().toISOString(),
    ...over,
  }
}

describe('IndexedDB 服务', () => {
  beforeEach(async () => {
    _resetDBForTesting()
    const db = await getDB()
    await db.clear('bookmarks')
    await db.clear('categories')
  })
  describe('bulkImport', () => {
    it('在单个事务中写入分类与书签', async () => {
      const category = makeCategory({ name: '导入分类' })
      const bookmark = makeBookmark({ name: '导入书签', categoryId: category.id })
      await bulkImport([category], [bookmark])
      expect(await getAllCategories()).toHaveLength(1)
      expect(await getAllBookmarks()).toHaveLength(1)
    })

    it('任一写入失败时整体回滚', async () => {
      const existing = makeBookmark({ id: 'dup', name: '已存在' })
      await addBookmark(existing)
      const category = makeCategory({ name: '应回滚分类' })
      const duplicate = makeBookmark({ id: 'dup', name: '重复 ID' })

      await expect(bulkImport([category], [duplicate])).rejects.toThrow()
      expect(await getAllCategories()).toHaveLength(0)
      expect(await getAllBookmarks()).toHaveLength(1)
    })
  })

  describe('Bookmark CRUD', () => {
    it('添加并获取书签', async () => {
      const bm = makeBookmark({ name: 'Google', url: 'https://google.com' })
      await addBookmark(bm)
      const all = await getAllBookmarks()
      expect(all).toHaveLength(1)
      expect(all[0].name).toBe('Google')
    })

    it('更新书签', async () => {
      const bm = makeBookmark({ name: 'Old' })
      await addBookmark(bm)
      await putBookmark({ ...bm, name: 'New' })
      const all = await getAllBookmarks()
      expect(all[0].name).toBe('New')
    })

    it('删除书签（硬删除）', async () => {
      const bm = makeBookmark()
      await addBookmark(bm)
      await deleteBookmark(bm.id)
      const all = await getAllBookmarks()
      expect(all).toHaveLength(0)
    })

    it('按 URL 统计重复数量', async () => {
      await addBookmark(makeBookmark({ url: 'https://dup.com' }))
      await addBookmark(makeBookmark({ url: 'https://dup.com' }))
      await addBookmark(makeBookmark({ url: 'https://other.com' }))
      expect(await countByUrl('https://dup.com')).toBe(2)
    })

    it('获取最近访问书签（按时间倒序）', async () => {
      await addBookmark(
        makeBookmark({ lastVisitedAt: '2026-01-01T00:00:00Z' }),
      )
      await addBookmark(
        makeBookmark({ lastVisitedAt: '2026-03-01T00:00:00Z' }),
      )
      await addBookmark(
        makeBookmark({ lastVisitedAt: '2026-02-01T00:00:00Z' }),
      )
      await addBookmark(makeBookmark({ lastVisitedAt: null }))
      const recent = await getRecentBookmarks(2)
      expect(recent).toHaveLength(2)
      expect(recent[0].lastVisitedAt).toBe('2026-03-01T00:00:00Z')
      expect(recent[1].lastVisitedAt).toBe('2026-02-01T00:00:00Z')
    })

    it('更新最后访问时间', async () => {
      const bm = makeBookmark({ lastVisitedAt: null })
      await addBookmark(bm)
      await updateLastVisited(bm.id, '2026-07-28T00:00:00Z')
      const all = await getAllBookmarks()
      expect(all[0].lastVisitedAt).toBe('2026-07-28T00:00:00Z')
    })
  })

  describe('Category CRUD', () => {
    it('添加并获取分类（按 order 排序）', async () => {
      await addCategory(makeCategory({ name: 'B', order: 1 }))
      await addCategory(makeCategory({ name: 'A', order: 0 }))
      const all = await getAllCategories()
      expect(all[0].name).toBe('A')
      expect(all[1].name).toBe('B')
    })

    it('更新分类', async () => {
      const cat = makeCategory({ name: 'Old' })
      await addCategory(cat)
      await putCategory({ ...cat, name: 'New' })
      const all = await getAllCategories()
      expect(all[0].name).toBe('New')
    })

    it('删除分类时级联置空书签 categoryId', async () => {
      const cat = makeCategory({ name: 'Work' })
      await addCategory(cat)
      await addBookmark(makeBookmark({ categoryId: cat.id }))
      await deleteCategory(cat.id)
      const cats = await getAllCategories()
      expect(cats).toHaveLength(0)
      const bms = await getAllBookmarks()
      expect(bms[0].categoryId).toBeNull()
    })

    it('按名称统计分类数量', async () => {
      await addCategory(makeCategory({ name: 'Work' }))
      expect(await countCategoryByName('Work')).toBe(1)
      expect(await countCategoryByName('Other')).toBe(0)
    })

    it('获取最大 order', async () => {
      expect(await getMaxCategoryOrder()).toBe(-1)
      await addCategory(makeCategory({ order: 0 }))
      await addCategory(makeCategory({ order: 2 }))
      await addCategory(makeCategory({ order: 1 }))
      expect(await getMaxCategoryOrder()).toBe(2)
    })
  })

  describe('批量操作', () => {
    it('批量添加书签', async () => {
      await bulkAddBookmarks([makeBookmark(), makeBookmark(), makeBookmark()])
      expect(await getAllBookmarks()).toHaveLength(3)
    })

    it('批量添加分类', async () => {
      await bulkAddCategories([makeCategory(), makeCategory()])
      expect(await getAllCategories()).toHaveLength(2)
    })
  })
})
