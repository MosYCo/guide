export interface Bookmark {
  id: string
  title: string
  url: string
  cat: string
  icon: string
  faviconUrl: string
  pin: boolean
  dockOrder?: number
}

export interface BookmarkDraft {
  title: string
  url: string
  cat: string
  icon: string
  faviconUrl: string
  pin: boolean
}

export interface BookmarkGroup {
  name: string
  items: Bookmark[]
}

export interface BookmarkImportResult {
  added: number
  updated: number
  skipped: number
}

export type DockDropPlacement = 'before' | 'after'

export type DockMoveDirection = 'left' | 'right'

export interface CategoryMeta {
  name: string
  order: number
  hidden?: boolean
}

export interface BookmarkExportData {
  version: 2
  bookmarks: Bookmark[]
  categories: CategoryMeta[]
}

export type BookmarkImportData = Bookmark[] | Partial<BookmarkExportData>
