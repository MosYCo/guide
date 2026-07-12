import { MAX_BACKUPS } from '../../constants'
import {
  createBookmarkHtml,
  createExportData,
  parseBookmarkHtml,
  parseImportData,
} from '../../storage'
import type {
  Bookmark,
  BookmarkBackup,
  BookmarkExportData,
  BookmarkImportResult,
  BookmarkSettings,
  CategoryMeta,
} from '../../types'
import { createBookmarkId } from '../../utils'
import type { BookmarkStore } from './store'

type ImportSource = 'json' | 'html'

interface IncomingImport {
  source: ImportSource
  bookmarks: Bookmark[]
  categories: CategoryMeta[]
  backups: BookmarkBackup[]
  settings: BookmarkSettings | null
}

const resolveIncoming = (raw: string): IncomingImport | null => {
  try {
    const parsed = parseImportData(JSON.parse(raw))
    if (parsed) return { source: 'json', ...parsed }
  } catch {
    // Not JSON; fall through to the HTML bookmark format.
  }

  const htmlBookmarks = parseBookmarkHtml(raw)
  if (!htmlBookmarks.length) return null

  return { source: 'html', bookmarks: htmlBookmarks, categories: [], backups: [], settings: null }
}

// HTML bookmark files carry no pin/dock/visit state, so merging them must not
// clobber those fields on existing bookmarks; JSON exports carry the full record.
const mergeBookmark = (existing: Bookmark, incoming: Bookmark, source: ImportSource): Bookmark => {
  if (source === 'html') {
    return {
      ...existing,
      title: incoming.title,
      cat: incoming.cat,
      icon: incoming.icon,
      faviconUrl: incoming.faviconUrl,
      tags: incoming.tags ?? [],
    }
  }

  return {
    ...existing,
    title: incoming.title,
    cat: incoming.cat,
    icon: incoming.icon,
    faviconUrl: incoming.faviconUrl,
    pin: incoming.pin,
    dockOrder: incoming.dockOrder,
    tags: incoming.tags ?? [],
    visits: incoming.visits && incoming.visits > 0 ? incoming.visits : existing.visits,
    lastVisitedAt: incoming.lastVisitedAt ?? existing.lastVisitedAt,
  }
}

const isSameBookmark = (a: Bookmark, b: Bookmark) => {
  return (
    a.title === b.title &&
    a.cat === b.cat &&
    a.icon === b.icon &&
    a.faviconUrl === b.faviconUrl &&
    a.pin === b.pin &&
    a.dockOrder === b.dockOrder &&
    (a.tags ?? []).join(',') === (b.tags ?? []).join(',') &&
    a.visits === b.visits &&
    a.lastVisitedAt === b.lastVisitedAt
  )
}

export const createImportExportActions = (store: BookmarkStore) => {
  const { bookmarks, categoriesMeta, backups, settings, commit, upsertCategory } = store

  const importBookmarks = (raw: string): BookmarkImportResult => {
    const incoming = resolveIncoming(raw)
    if (!incoming) return { ok: false, reason: '未找到可导入的 JSON 或 HTML 书签数据' }

    const counts = { added: 0, updated: 0, skipped: 0 }

    const result = commit(
      incoming.source === 'html' ? '导入 HTML 书签' : '导入书签',
      () => {
        incoming.categories.forEach((category) => upsertCategory(category.name, category.hidden))
        if (incoming.settings) settings.value = { ...incoming.settings }

        const nextBookmarks = [...bookmarks.value]
        const indexByUrl = new Map(nextBookmarks.map((bookmark, index) => [bookmark.url, index]))
        const usedIds = new Set(nextBookmarks.map((bookmark) => bookmark.id))

        incoming.bookmarks.forEach((bookmark) => {
          upsertCategory(bookmark.cat)
          const existingIndex = indexByUrl.get(bookmark.url)

          if (existingIndex === undefined) {
            const id = usedIds.has(bookmark.id) ? createBookmarkId() : bookmark.id
            const added = { ...bookmark, id }
            usedIds.add(id)
            indexByUrl.set(added.url, nextBookmarks.length)
            nextBookmarks.push(added)
            counts.added += 1
            return
          }

          const existing = nextBookmarks[existingIndex]
          const merged = mergeBookmark(existing, bookmark, incoming.source)

          if (isSameBookmark(existing, merged)) {
            counts.skipped += 1
            return
          }

          nextBookmarks[existingIndex] = merged
          counts.updated += 1
        })

        if (incoming.backups.length) {
          backups.value = [...incoming.backups, ...backups.value].slice(0, MAX_BACKUPS)
        }

        bookmarks.value = nextBookmarks
      },
      {
        backup: true,
        backupLabel: '导入前备份',
        failReason: '导入失败：浏览器存储空间不足或不可用',
      },
    )

    return result.ok ? { ok: true, ...counts } : result
  }

  const exportBookmarks = (): BookmarkExportData => {
    return createExportData(bookmarks.value, categoriesMeta.value, backups.value, settings.value)
  }

  const exportSelectedBookmarks = (ids: string[]): BookmarkExportData => {
    const selected = new Set(ids)
    return createExportData(
      bookmarks.value.filter((bookmark) => selected.has(bookmark.id)),
      categoriesMeta.value,
      [],
      settings.value,
    )
  }

  const exportBookmarksAsHtml = (ids?: string[]): string => {
    const selected = ids ? new Set(ids) : null
    const exportedBookmarks = selected
      ? bookmarks.value.filter((bookmark) => selected.has(bookmark.id))
      : bookmarks.value
    return createBookmarkHtml(exportedBookmarks)
  }

  return {
    importBookmarks,
    exportBookmarks,
    exportSelectedBookmarks,
    exportBookmarksAsHtml,
  }
}
