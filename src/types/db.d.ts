import { type DBSchema } from 'idb'

declare namespace DB {
  interface MyDB extends DBSchema {
    bookmarks: {
      key: number
      value: Entity.Bookmark
      indexes: { 'by-title': string }
    }
    todos: {
      key: number
      value: Entity.Todo
      indexes: {
        'by-completed': BaseKey.TodoCompleted
        'by-category': string
        'by-dueDate': Date
      }
    }
  }
}
