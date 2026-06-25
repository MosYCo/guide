export interface Bookmark {
  id: string
  title: string
  url: string
  cat: string
  icon: string
  pin: boolean
}

export interface BookmarkDraft {
  title: string
  url: string
  cat: string
  icon: string
  pin: boolean
}

export interface BookmarkGroup {
  name: string
  items: Bookmark[]
}
