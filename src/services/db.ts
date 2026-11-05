/**
 * IndexedDB 数据服务
 * 持久化所有数据到 IndexedDB
 */

import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from 'idb'
import type { Bookmark, BookmarkDropPosition, Category } from '@/types'

export const DB_NAME = 'bookmark-navigation'
export const DB_VERSION = 1
export const MAX_PINNED_BOOKMARKS = 5

/** 手动排序时相邻 order 的默认间距 */
const ORDER_GAP = 1024

export function upgradeBookmarkDB(db: IDBPDatabase<BookmarkNavDB>, oldVersion: number): void {
  if (oldVersion >= 1) return
  const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' })
  bookmarkStore.createIndex('categoryId', 'categoryId')
  bookmarkStore.createIndex('createdAt', 'createdAt')
  bookmarkStore.createIndex('lastVisitedAt', 'lastVisitedAt')
  bookmarkStore.createIndex('url', 'url')

  const categoryStore = db.createObjectStore('categories', { keyPath: 'id' })
  categoryStore.createIndex('order', 'order')
  categoryStore.createIndex('name', 'name')
}

interface BookmarkNavDB extends DBSchema {
  bookmarks: {
    key: string
    value: Bookmark
    indexes: {
      categoryId: string
      createdAt: string
      lastVisitedAt: string
      url: string
    }
  }
  categories: {
    key: string
    value: Category
    indexes: {
      order: number
      name: string
    }
  }
}

let dbPromise: Promise<IDBPDatabase<BookmarkNavDB>> | null = null

/**
 * 获取（懒初始化）IndexedDB 实例。
 */
export function getDB(): Promise<IDBPDatabase<BookmarkNavDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BookmarkNavDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        upgradeBookmarkDB(db, oldVersion)
      },
      blocked() {
        console.warn('IndexedDB 升级被其他标签页阻塞，请关闭其他标签页')
      },
      blocking() {
        console.warn('另一个标签页正在升级数据库，请稍后重试')
      },
      terminated() {
        // 浏览器回收连接后重建,避免后续操作一直指向已关闭的 DB
        dbPromise = null
      },
    }).catch((error) => {
      // 不缓存 rejected promise,允许用户重试
      dbPromise = null
      throw error
    })
  }
  return dbPromise
}

/**
 * 重置数据库实例（仅测试用）。
 */
export function _resetDBForTesting() {
  dbPromise = null
}

// ===== Bookmark CRUD =====

/**
 * 书签排序键：显式 order 优先，旧数据回退到 createdAt 时间戳。
 * 两者都是毫秒级数值，可放在同一坐标系里比较。
 */
export function bookmarkOrderKey(bookmark: Bookmark): number {
  if (typeof bookmark.order === 'number' && Number.isFinite(bookmark.order)) {
    return bookmark.order
  }
  const created = Date.parse(bookmark.createdAt)
  return Number.isNaN(created) ? 0 : created
}

/** 按手动排序键倒序排列（越大越靠前），同键回退 createdAt 与 id。 */
export function sortBookmarks(bookmarks: Bookmark[]): Bookmark[] {
  return [...bookmarks].sort((a, b) => {
    const byOrder = bookmarkOrderKey(b) - bookmarkOrderKey(a)
    if (byOrder !== 0) return byOrder
    const byDate = (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id)
  })
}

export async function getAllBookmarks(): Promise<Bookmark[]> {
  const db = await getDB()
  const all = await db.getAll('bookmarks')
  return sortBookmarks(all)
}

export async function getBookmark(id: string): Promise<Bookmark | undefined> {
  const db = await getDB()
  return db.get('bookmarks', id)
}

export async function addBookmark(bookmark: Bookmark): Promise<string> {
  const db = await getDB()
  await db.add('bookmarks', bookmark)
  return bookmark.id
}

export async function putBookmark(bookmark: Bookmark): Promise<string> {
  const db = await getDB()
  await db.put('bookmarks', bookmark)
  return bookmark.id
}

export async function deleteBookmark(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('bookmarks', id)
}

export async function countByUrl(url: string): Promise<number> {
  const db = await getDB()
  const tx = db.transaction('bookmarks', 'readonly')
  const count = await tx.store.index('url').count(url)
  await tx.done
  return count
}

export async function getRecentBookmarks(limit = 10): Promise<Bookmark[]> {
  const db = await getDB()
  // 索引按 lastVisitedAt 升序;反向取最近 limit 条(null 不进索引)
  const visited = await db.getAllFromIndex('bookmarks', 'lastVisitedAt')
  return visited.reverse().slice(0, limit)
}

export async function updateLastVisited(id: string, visitedAt: string): Promise<void> {
  const db = await getDB()
  // 读改写放在同一个事务里,避免与编辑/移动分类交错时用旧快照覆盖新字段
  const tx = db.transaction('bookmarks', 'readwrite')
  const existing = await tx.store.get(id)
  if (existing) {
    await tx.store.put({ ...existing, lastVisitedAt: visitedAt })
  }
  await tx.done
}

// ===== Category CRUD =====

/** 在同一个只读事务中读取书签与分类,保证导出快照一致。 */
export async function getAllDataForExport(): Promise<{
  bookmarks: Bookmark[]
  categories: Category[]
}> {
  const db = await getDB()
  const tx = db.transaction(['bookmarks', 'categories'], 'readonly')
  const [bookmarks, categories] = await Promise.all([
    tx.objectStore('bookmarks').getAll(),
    tx.objectStore('categories').getAll(),
  ])
  await tx.done
  return { bookmarks: sortBookmarks(bookmarks), categories }
}

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDB()
  const all = await db.getAll('categories')
  return all.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

export async function addCategory(category: Category): Promise<string> {
  const db = await getDB()
  await db.add('categories', category)
  return category.id
}

export async function putCategory(category: Category): Promise<string> {
  const db = await getDB()
  await db.put('categories', category)
  return category.id
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['categories', 'bookmarks'], 'readwrite')
  await tx.objectStore('categories').delete(id)
  // 级联置空关联书签的 categoryId
  const bookmarkStore = tx.objectStore('bookmarks')
  const index = bookmarkStore.index('categoryId')
  let cursor = await index.openCursor(IDBKeyRange.only(id))
  while (cursor) {
    await cursor.update({ ...cursor.value, categoryId: null })
    cursor = await cursor.continue()
  }
  await tx.done
}

export async function countCategoryByName(name: string): Promise<number> {
  const db = await getDB()
  const all = await db.getAll('categories')
  return all.filter((c) => c.name === name).length
}

export async function getMaxCategoryOrder(): Promise<number> {
  const db = await getDB()
  const all = await db.getAll('categories')
  if (all.length === 0) return -1
  return Math.max(...all.map((c) => c.order))
}

/** 创建分类:唯一名校验、max(order)+1 与写入在同一事务内完成。 */
export async function createCategoryWithUniqueName(
  input: Omit<Category, 'order'>,
): Promise<Category> {
  const db = await getDB()
  const tx = db.transaction('categories', 'readwrite')
  const store = tx.objectStore('categories')
  const duplicate = await store.index('name').count(input.name)
  if (duplicate > 0) {
    throw new Error(`分类「${input.name}」已存在`)
  }
  const all = await store.getAll()
  const order = all.reduce((max, category) => Math.max(max, category.order), -1) + 1
  const created: Category = { ...input, order }
  await store.add(created)
  await tx.done
  return created
}

/** 重命名分类:唯一名校验与写入在同一事务内完成。 */
export async function renameCategoryWithUniqueName(id: string, name: string): Promise<Category> {
  const db = await getDB()
  const tx = db.transaction('categories', 'readwrite')
  const store = tx.objectStore('categories')
  const existing = await store.get(id)
  if (!existing) throw new Error('分类不存在')
  if (existing.name !== name) {
    const duplicate = await store.index('name').count(name)
    if (duplicate > 0) {
      throw new Error(`分类「${name}」已存在`)
    }
  }
  const updated: Category = { ...existing, name }
  await store.put(updated)
  await tx.done
  return updated
}

/** 按给定 id 顺序重排全部分类,单事务写回并补全缺失项。 */
export async function reorderCategoriesInDb(ids: string[]): Promise<Category[]> {
  const db = await getDB()
  const tx = db.transaction('categories', 'readwrite')
  const store = tx.objectStore('categories')
  const all = await store.getAll()
  const byId = new Map(all.map((category) => [category.id, category]))
  const ordered: Category[] = []

  for (const id of ids) {
    const category = byId.get(id)
    if (!category) continue
    ordered.push({ ...category, order: ordered.length })
    byId.delete(id)
  }
  for (const category of byId.values()) {
    ordered.push({ ...category, order: ordered.length })
  }
  for (const category of ordered) {
    await store.put(category)
  }
  await tx.done
  return ordered
}

async function resolveCategoryId(
  tx: IDBPTransaction<BookmarkNavDB, ['categories', 'bookmarks'], 'readwrite'>,
  categoryId: string | null,
): Promise<string | null> {
  if (!categoryId) return null
  const category = await tx.objectStore('categories').get(categoryId)
  return category ? categoryId : null
}

/** 新增书签:同一事务内校验分类,不存在则落为未分类。 */
export async function addBookmarkWithValidCategory(bookmark: Bookmark): Promise<Bookmark> {
  const db = await getDB()
  const tx = db.transaction(['categories', 'bookmarks'], 'readwrite')
  const updated: Bookmark = {
    ...bookmark,
    categoryId: await resolveCategoryId(tx, bookmark.categoryId),
  }
  await tx.objectStore('bookmarks').add(updated)
  await tx.done
  return updated
}

/** 编辑书签:在事务内读取当前记录,只覆盖可编辑字段,保留 lastVisitedAt。 */
export async function updateBookmarkFields(
  id: string,
  fields: Partial<Pick<Bookmark, 'url' | 'name' | 'icon' | 'categoryId'>>,
): Promise<Bookmark> {
  const db = await getDB()
  const tx = db.transaction(['categories', 'bookmarks'], 'readwrite')
  const bookmarkStore = tx.objectStore('bookmarks')
  const existing = await bookmarkStore.get(id)
  if (!existing) {
    throw new Error('书签不存在或已被删除')
  }
  const requestedCategory =
    fields.categoryId !== undefined ? fields.categoryId : existing.categoryId
  const updated: Bookmark = {
    ...existing,
    ...fields,
    categoryId: await resolveCategoryId(tx, requestedCategory),
  }
  await bookmarkStore.put(updated)
  await tx.done
  return updated
}

/** 在单个事务内检查置顶名额并写入，防止多标签页同时超过上限。 */
export async function setBookmarkPinned(id: string, pinned: boolean): Promise<Bookmark> {
  const db = await getDB()
  const tx = db.transaction('bookmarks', 'readwrite')
  const store = tx.objectStore('bookmarks')
  const existing = await store.get(id)
  if (!existing) {
    await tx.done
    throw new Error('书签不存在或已被删除')
  }
  if (Boolean(existing.pinnedAt) === pinned) {
    await tx.done
    return existing
  }
  if (pinned) {
    const all = await store.getAll()
    if (all.filter((bookmark) => bookmark.pinnedAt).length >= MAX_PINNED_BOOKMARKS) {
      await tx.done
      throw new Error(`最多置顶 ${MAX_PINNED_BOOKMARKS} 个书签，请先取消一个`)
    }
  }
  const updated: Bookmark = { ...existing, pinnedAt: pinned ? new Date().toISOString() : null }
  await store.put(updated)
  await tx.done
  return updated
}

/**
 * 将书签移动到目标书签之前/之后，单事务读取并写回。
 * 新 order 取相邻两项的中点；间距耗尽时按当前顺序整表重编号。
 * @returns 排序后的完整书签列表
 */
export async function reorderBookmarkInDb(
  id: string,
  targetId: string,
  position: BookmarkDropPosition,
): Promise<Bookmark[]> {
  const db = await getDB()
  if (id === targetId) return sortBookmarks(await db.getAll('bookmarks'))

  const tx = db.transaction('bookmarks', 'readwrite')
  const store = tx.objectStore('bookmarks')
  const all = await store.getAll()
  const dragged = all.find((bookmark) => bookmark.id === id)
  if (!dragged) {
    await tx.done
    throw new Error('书签不存在或已被删除')
  }
  const target = all.find((bookmark) => bookmark.id === targetId)
  if (!target) {
    await tx.done
    throw new Error('目标书签不存在或已被删除')
  }

  const ordered = sortBookmarks(all).filter((bookmark) => bookmark.id !== id)
  const targetIndex = ordered.findIndex((bookmark) => bookmark.id === targetId)
  const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
  const prev = ordered[insertIndex - 1]
  const next = ordered[insertIndex]

  // 精度或边界导致取不出合法 order 时，按当前顺序整表重编号并插入被拖拽项
  const renumber = async (): Promise<Bookmark[]> => {
    const reordered = [...ordered]
    reordered.splice(insertIndex, 0, dragged)
    const base = (reordered.length + 1) * ORDER_GAP
    const numbered = reordered.map((bookmark, index) => ({
      ...bookmark,
      order: base - index * ORDER_GAP,
    }))
    for (const bookmark of numbered) {
      await store.put(bookmark)
    }
    await tx.done
    return numbered
  }

  let newOrder: number
  if (prev && next) {
    const prevKey = bookmarkOrderKey(prev)
    const nextKey = bookmarkOrderKey(next)
    const midOrder = (prevKey + nextKey) / 2
    if (midOrder > nextKey && midOrder < prevKey) {
      newOrder = midOrder
    } else {
      return await renumber()
    }
  } else if (next) {
    const nextKey = bookmarkOrderKey(next)
    const candidate = nextKey + ORDER_GAP
    if (!Number.isFinite(candidate) || candidate <= nextKey) return await renumber()
    newOrder = candidate
  } else {
    const prevKey = bookmarkOrderKey(prev!)
    const candidate = prevKey - ORDER_GAP
    if (!Number.isFinite(candidate) || candidate >= prevKey) return await renumber()
    newOrder = candidate
  }

  const updated: Bookmark = { ...dragged, order: newOrder }
  await store.put(updated)
  await tx.done
  return sortBookmarks(all.map((bookmark) => (bookmark.id === id ? updated : bookmark)))
}

// ===== Bulk operations（导入用）=====

export async function bulkAddBookmarks(
  bookmarks: Bookmark[],
  tx?: IDBPTransaction<BookmarkNavDB, ['bookmarks'], 'readwrite'>,
): Promise<void> {
  const db = await getDB()
  const transaction = tx ?? db.transaction('bookmarks', 'readwrite')
  const store = transaction.objectStore('bookmarks')
  for (const b of bookmarks) {
    await store.add(b)
  }
  if (!tx) await transaction.done
}

export async function bulkAddCategories(
  categories: Category[],
  tx?: IDBPTransaction<BookmarkNavDB, ['categories'], 'readwrite'>,
): Promise<void> {
  const db = await getDB()
  const transaction = tx ?? db.transaction('categories', 'readwrite')
  const store = transaction.objectStore('categories')
  for (const c of categories) {
    await store.add(c)
  }
  if (!tx) await transaction.done
}

/**
 * 导入专用:分类与书签在同一个事务中写入。
 * 任一条失败时整个事务回滚,避免留下孤儿分类或部分导入。
 */
export async function bulkImport(categories: Category[], bookmarks: Bookmark[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['categories', 'bookmarks'], 'readwrite')
  const categoryStore = tx.objectStore('categories')
  const bookmarkStore = tx.objectStore('bookmarks')
  // 同步排队所有请求;任一失败时事务整体 abort,分类与书签一起回滚
  try {
    const existing = await bookmarkStore.getAll()
    let availablePins = Math.max(
      0,
      MAX_PINNED_BOOKMARKS - existing.filter((b) => b.pinnedAt).length,
    )
    const requests: Promise<unknown>[] = []
    for (const c of categories) requests.push(categoryStore.add(c))
    for (const b of bookmarks) {
      const pinnedAt = b.pinnedAt && availablePins-- > 0 ? b.pinnedAt : null
      requests.push(bookmarkStore.add({ ...b, pinnedAt }))
    }
    await Promise.all(requests)
    await tx.done
  } catch (error) {
    // 同步异常(如 DataCloneError)也要 abort,避免已排队请求被部分提交
    try {
      tx.abort()
    } catch {
      // 事务可能已结束
    }
    // 处理 abort 产生的 tx.done rejection,避免未处理的 Promise 拒绝
    await tx.done.catch(() => undefined)
    throw error
  }
}
