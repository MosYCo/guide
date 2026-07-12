import type {
  BookmarkIconMode,
  BookmarkUndoResult,
  BulkOperationResult,
  MutationResult,
} from '../../types'
import { normalizeDockOrder } from '../../utils'
import type { BookmarkStore } from './store'

export const createHistoryActions = (store: BookmarkStore) => {
  const { bookmarks, categoriesMeta, backups, undoSnapshots, settings, commit } = store

  const restoreBackup = (id: string): MutationResult => {
    const backup = backups.value.find((item) => item.id === id)
    if (!backup) return { ok: false, reason: '未找到备份' }

    return commit(
      '恢复前自动备份',
      () => {
        bookmarks.value = normalizeDockOrder(backup.bookmarks)
        categoriesMeta.value = backup.categories.map((category) => ({ ...category }))
      },
      { backup: true },
    )
  }

  const undoLastChange = (): BookmarkUndoResult => {
    const snapshot = undoSnapshots.value[0]
    if (!snapshot) return { ok: false, reason: '没有可撤销的操作' }

    const result = commit(
      snapshot.label,
      () => {
        bookmarks.value = normalizeDockOrder(snapshot.bookmarks)
        categoriesMeta.value = [...snapshot.categories]
        undoSnapshots.value = undoSnapshots.value.slice(1)
      },
      { undo: false, failReason: '撤销失败：浏览器存储空间不足或不可用' },
    )

    return result.ok ? { ok: true, label: snapshot.label } : result
  }

  const clearBackups = (): BulkOperationResult | { ok: false; reason: string } => {
    const count = backups.value.length
    const result = commit(
      '清理备份',
      () => {
        backups.value = []
      },
      { undo: false, failReason: '清理备份失败：浏览器存储空间不足或不可用' },
    )

    return result.ok ? { ok: true, count } : result
  }

  const setIconMode = (iconMode: BookmarkIconMode): MutationResult => {
    return commit(
      '切换图标模式',
      () => {
        settings.value = { ...settings.value, iconMode }
      },
      { undo: false, failReason: '保存设置失败：浏览器存储空间不足或不可用' },
    )
  }

  return {
    restoreBackup,
    undoLastChange,
    clearBackups,
    setIconMode,
  }
}
