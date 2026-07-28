/**
 * IndexedDB 数据服务
 * FR-004: 持久化所有数据到 IndexedDB
 * @see specs/001-bookmark-navigation/data-model.md §IndexedDB Schema
 */

import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from 'idb'
import type { Bookmark, Category } from '@/types'

const DB_NAME = 'bookmark-navigation'
const DB_VERSION = 1

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
      upgrade(db) {
        const bookmarkStore = db.createObjectStore('bookmarks', {
          keyPath: 'id',
        })
        bookmarkStore.createIndex('categoryId', 'categoryId')
        bookmarkStore.createIndex('createdAt', 'createdAt')
        bookmarkStore.createIndex('lastVisitedAt', 'lastVisitedAt')
        bookmarkStore.createIndex('url', 'url')

        const categoryStore = db.createObjectStore('categories', {
          keyPath: 'id',
        })
        categoryStore.createIndex('order', 'order')
        categoryStore.createIndex('name', 'name')
      },
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

export async function getAllBookmarks(): Promise<Bookmark[]> {
  const db = await getDB()
  const all = await db.getAll('bookmarks')
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
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
  const index = tx.store.index('url')
  let count = 0
  let cursor = await index.openCursor(IDBKeyRange.only(url))
  while (cursor) {
    count++
    cursor = await cursor.continue()
  }
  await tx.done
  return count
}

export async function getRecentBookmarks(limit = 10): Promise<Bookmark[]> {
  const db = await getDB()
  const all = await db.getAll('bookmarks')
  return all
    .filter((b) => b.lastVisitedAt !== null)
    .sort((a, b) => ((a.lastVisitedAt ?? '') < (b.lastVisitedAt ?? '') ? 1 : -1))
    .slice(0, limit)
}

export async function updateLastVisited(id: string, visitedAt: string): Promise<void> {
  const db = await getDB()
  const existing = await db.get('bookmarks', id)
  if (existing) {
    await db.put('bookmarks', { ...existing, lastVisitedAt: visitedAt })
  }
}

// ===== Category CRUD =====

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDB()
  const all = await db.getAll('categories')
  return all.sort((a, b) => a.order - b.order)
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
