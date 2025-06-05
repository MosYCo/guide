import type { DB } from '@/types/db'
import { openDB, type IDBPDatabase } from 'idb'

let dbPromise: Promise<IDBPDatabase<DB.MyDB>> | null = null;

const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB<DB.MyDB>('PersonalStartPageDB', 1, {
      upgrade(db) {
        // 创建书签存储
        const bookmarkStore = db.createObjectStore('bookmarks', {
          keyPath: 'id',
          autoIncrement: true
        })
        bookmarkStore.createIndex('by-title', 'title')

        // 创建待办事项存储
        const todoStore = db.createObjectStore('todos', {
          keyPath: 'id',
          autoIncrement: true
        })
        todoStore.createIndex('by-completed', 'completed')
        todoStore.createIndex('by-category', 'category')
        todoStore.createIndex('by-dueDate', 'dueDate')
      }
    })
  }
  return dbPromise
}

export const addBookmark = async (bookmark: Entity.Bookmark) => {
  const db = await getDB();
  return db.add('bookmarks', { ...bookmark })
}

export const updateBookmark = async (id: number, bookmark: Entity.Bookmark) => {
  const db = await getDB();
  return db.put('bookmarks', { ...bookmark, id })
}

export const deleteBookmark = async (id: number) => {
  const db = await getDB();
  return db.delete('bookmarks', id)
}

export const getAllBookmarks = async () => {
  const db = await getDB();
  return db.getAll('bookmarks')
}

// 待办操作
export const addTodo = async (todo: Entity.Todo) => {
  const db = await getDB();
  return db.add('todos', { ...todo })
}

export const updateTodo = async (id: number, todo: Entity.Todo) => {
  const db = await getDB();
  return db.put('todos', { ...todo, id })
}

export const deleteTodo = async (id: number) => {
  const db = await getDB();
  return db.delete('todos', id)
}

export const getAllTodos = async () => {
  const db = await getDB();
  return db.getAll('todos')
}

