declare namespace Entity {
  interface Todo {
    id?: number
    title: string
    category: string
    completed: BaseKey.TodoCompleted
    description: ''
    createdAt: Date
    completedAt?: Date
    dueDate?: Date
  }
  interface Bookmark {
    id?: number
    title: string
    url: string
    icon?: string
  }
}
