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
  addBookmarkWithValidCategory,
  updateBookmarkFields,
  setBookmarkPinned,
  reorderBookmarkInDb,
  sortBookmarks,
  createCategoryWithUniqueName,
  renameCategoryWithUniqueName,
  reorderCategoriesInDb,
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
  describe('分类事务', () => {
    it('创建时校验唯一名并分配 order', async () => {
      const first = await createCategoryWithUniqueName({
        id: 'cat-a',
        name: 'A',
        createdAt: '2026-01-01T00:00:00Z',
      })
      const second = await createCategoryWithUniqueName({
        id: 'cat-b',
        name: 'B',
        createdAt: '2026-01-01T00:00:00Z',
      })
      expect(first.order).toBe(0)
      expect(second.order).toBe(1)
      await expect(
        createCategoryWithUniqueName({
          id: 'cat-c',
          name: 'A',
          createdAt: '2026-01-01T00:00:00Z',
        }),
      ).rejects.toThrow('已存在')
    })

    it('重命名校验唯一名', async () => {
      await createCategoryWithUniqueName({
        id: 'cat-a',
        name: 'A',
        createdAt: '2026-01-01T00:00:00Z',
      })
      await createCategoryWithUniqueName({
        id: 'cat-b',
        name: 'B',
        createdAt: '2026-01-01T00:00:00Z',
      })
      await expect(renameCategoryWithUniqueName('cat-b', 'A')).rejects.toThrow('已存在')
      const renamed = await renameCategoryWithUniqueName('cat-b', 'C')
      expect(renamed.name).toBe('C')
    })

    it('重排分配连续 order 并补全未列出的分类', async () => {
      for (const [id, name] of [
        ['cat-a', 'A'],
        ['cat-b', 'B'],
        ['cat-c', 'C'],
      ] as const) {
        await createCategoryWithUniqueName({
          id,
          name,
          createdAt: '2026-01-01T00:00:00Z',
        })
      }
      const ordered = await reorderCategoriesInDb(['cat-c', 'cat-a'])
      expect(ordered.map((c) => c.id)).toEqual(['cat-c', 'cat-a', 'cat-b'])
      expect(ordered.map((c) => c.order)).toEqual([0, 1, 2])
    })
  })

  describe('书签写入完整性', () => {
    it('新增时分类不存在则置空', async () => {
      const bookmark = makeBookmark({ categoryId: 'missing-category' })
      const saved = await addBookmarkWithValidCategory(bookmark)
      expect(saved.categoryId).toBeNull()
      expect((await getAllBookmarks())[0].categoryId).toBeNull()
    })

    it('编辑保留 lastVisitedAt 并拒绝已删除书签', async () => {
      const category = makeCategory({ name: '有效分类' })
      await addCategory(category)
      const bookmark = makeBookmark({
        categoryId: category.id,
        lastVisitedAt: '2026-01-02T00:00:00Z',
      })
      await addBookmark(bookmark)

      const updated = await updateBookmarkFields(bookmark.id, {
        name: '新名称',
        categoryId: null,
      })
      expect(updated.name).toBe('新名称')
      expect(updated.categoryId).toBeNull()
      expect(updated.lastVisitedAt).toBe('2026-01-02T00:00:00Z')

      await deleteBookmark(bookmark.id)
      await expect(updateBookmarkFields(bookmark.id, { name: '复活' })).rejects.toThrow('已被删除')
    })
  })

  describe('书签置顶', () => {
    it('限制最多 5 个并在取消后释放名额，刷新仍保留状态', async () => {
      const bookmarks = Array.from({ length: 6 }, (_, index) =>
        makeBookmark({ id: `pin-${index}`, name: `Pin ${index}` }),
      )
      for (const bookmark of bookmarks) await addBookmark(bookmark)
      for (const bookmark of bookmarks.slice(0, 5)) {
        expect((await setBookmarkPinned(bookmark.id, true)).pinnedAt).toEqual(expect.any(String))
      }
      await expect(setBookmarkPinned(bookmarks[5].id, true)).rejects.toThrow('最多置顶 5 个书签')
      expect((await getAllBookmarks()).filter((bookmark) => bookmark.pinnedAt)).toHaveLength(5)
      await setBookmarkPinned(bookmarks[0].id, false)
      expect((await setBookmarkPinned(bookmarks[5].id, true)).pinnedAt).toEqual(expect.any(String))
      expect((await getAllBookmarks()).filter((bookmark) => bookmark.pinnedAt)).toHaveLength(5)
    })

    it('已置顶重复操作不消耗名额，已删除书签无法置顶', async () => {
      const bookmark = makeBookmark()
      await addBookmark(bookmark)
      const first = await setBookmarkPinned(bookmark.id, true)
      const second = await setBookmarkPinned(bookmark.id, true)
      expect(second.pinnedAt).toBe(first.pinnedAt)
      await deleteBookmark(bookmark.id)
      await expect(setBookmarkPinned(bookmark.id, true)).rejects.toThrow('已被删除')
    })
  })

  describe('书签排序', () => {
    it('按 order 倒序排列，缺省时回退创建时间', async () => {
      await addBookmark(makeBookmark({ id: 'a', createdAt: '2026-01-01T00:00:00Z', order: 100 }))
      await addBookmark(makeBookmark({ id: 'b', createdAt: '2026-03-01T00:00:00Z' }))
      await addBookmark(makeBookmark({ id: 'c', createdAt: '2026-02-01T00:00:00Z' }))

      expect((await getAllBookmarks()).map((bookmark) => bookmark.id)).toEqual(['b', 'c', 'a'])
      expect(
        sortBookmarks([
          makeBookmark({ id: 'same-1', createdAt: '2026-01-01T00:00:00Z', order: 100 }),
          makeBookmark({ id: 'same-2', createdAt: '2026-01-01T00:00:00Z', order: 100 }),
        ]).map((bookmark) => bookmark.id),
      ).toEqual(['same-1', 'same-2'])
    })

    it('拖到目标前/后并持久化', async () => {
      for (const [id, order] of [
        ['a', 3000],
        ['b', 2000],
        ['c', 1000],
      ] as const) {
        await addBookmark(makeBookmark({ id, order }))
      }
      expect((await getAllBookmarks()).map((bookmark) => bookmark.id)).toEqual(['a', 'b', 'c'])

      const movedAfter = await reorderBookmarkInDb('a', 'c', 'after')
      expect(movedAfter.map((bookmark) => bookmark.id)).toEqual(['b', 'c', 'a'])
      expect((await getAllBookmarks()).map((bookmark) => bookmark.id)).toEqual(['b', 'c', 'a'])

      const movedBefore = await reorderBookmarkInDb('c', 'b', 'before')
      expect(movedBefore.map((bookmark) => bookmark.id)).toEqual(['c', 'b', 'a'])
      expect((await getAllBookmarks()).map((bookmark) => bookmark.id)).toEqual(['c', 'b', 'a'])
    })

    it('拖到列表顶部/底部', async () => {
      for (const [id, order] of [
        ['a', 3000],
        ['b', 2000],
        ['c', 1000],
      ] as const) {
        await addBookmark(makeBookmark({ id, order }))
      }
      await reorderBookmarkInDb('c', 'a', 'before')
      expect((await getAllBookmarks()).map((bookmark) => bookmark.id)).toEqual(['c', 'a', 'b'])
      await reorderBookmarkInDb('c', 'b', 'after')
      expect((await getAllBookmarks()).map((bookmark) => bookmark.id)).toEqual(['a', 'b', 'c'])
    })

    it('相邻 order 间距耗尽时重排全部书签且保持顺序', async () => {
      // 1e12 附近 double 的 ULP 约为 2^-13，取相邻两个可表示值让中点无法严格居中
      const high = 1e12
      const low = high - 2 ** -13
      await addBookmark(makeBookmark({ id: 'a', order: high }))
      await addBookmark(makeBookmark({ id: 'b', order: low }))
      await addBookmark(makeBookmark({ id: 'c', order: low - 1000 }))

      const moved = await reorderBookmarkInDb('c', 'a', 'after')
      expect(moved.map((bookmark) => bookmark.id)).toEqual(['a', 'c', 'b'])
      const all = await getAllBookmarks()
      expect(all.map((bookmark) => bookmark.id)).toEqual(['a', 'c', 'b'])
      expect(new Set(all.map((bookmark) => bookmark.order)).size).toBe(3)
    })

    it('目标书签不存在时拒绝移动', async () => {
      await addBookmark(makeBookmark({ id: 'a', order: 1 }))
      await expect(reorderBookmarkInDb('a', 'missing', 'before')).rejects.toThrow('不存在')
    })

    it('极端 order 无法生成更大的值时重编号', async () => {
      await addBookmark(makeBookmark({ id: 'a', order: Number.MAX_VALUE }))
      await addBookmark(makeBookmark({ id: 'b', order: 0 }))

      const moved = await reorderBookmarkInDb('b', 'a', 'before')
      expect(moved.map((bookmark) => bookmark.id)).toEqual(['b', 'a'])
      expect(moved.every((bookmark) => Number.isFinite(bookmark.order))).toBe(true)
      expect((await getAllBookmarks()).map((bookmark) => bookmark.id)).toEqual(['b', 'a'])
    })
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
      await addBookmark(makeBookmark({ lastVisitedAt: '2026-01-01T00:00:00Z' }))
      await addBookmark(makeBookmark({ lastVisitedAt: '2026-03-01T00:00:00Z' }))
      await addBookmark(makeBookmark({ lastVisitedAt: '2026-02-01T00:00:00Z' }))
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
