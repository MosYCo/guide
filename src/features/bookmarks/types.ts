export interface Bookmark {
  id: string
  title: string
  url: string
  cat: string
  icon: string
  faviconUrl: string
  pin: boolean
  dockOrder?: number
  tags?: string[]
}

export interface BookmarkDraft {
  title: string
  url: string
  cat: string
  icon: string
  faviconUrl: string
  pin: boolean
  tagsText: string
}

export interface BookmarkGroup {
  name: string
  items: Bookmark[]
}

export type BookmarkImportResult =
  | {
      ok: true
      added: number
      updated: number
      skipped: number
    }
  | {
      ok: false
      reason: string
    }

export type DockDropPlacement = 'before' | 'after'

export type DockMoveDirection = 'left' | 'right'

export interface CategoryMeta {
  name: string
  order: number
  hidden?: boolean
}

export interface CategorySummary extends CategoryMeta {
  count: number
}

export interface BookmarkBackup {
  id: string
  createdAt: string
  label: string
  bookmarks: Bookmark[]
  categories: CategoryMeta[]
}

export interface BookmarkExportData {
  version: 3
  bookmarks: Bookmark[]
  categories: CategoryMeta[]
  backups?: BookmarkBackup[]
}

export type BookmarkImportData = Bookmark[] | Partial<BookmarkExportData>

export interface BulkOperationResult {
  ok: true
  count: number
}

export type BookmarkActionResult = { ok: true; bookmark: Bookmark } | { ok: false; reason: string }

export type MutationResult = { ok: true } | { ok: false; reason: string }
