export interface Bookmark {
  id: string
  title: string
  url: string
  cat: string
  icon: string
  faviconUrl: string
  pin: boolean
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
