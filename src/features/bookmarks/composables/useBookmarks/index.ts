import { createCategoryActions } from './categories'
import { createCleanupActions } from './cleanup'
import { createDockActions } from './dock'
import { createDraftActions } from './draft'
import { createHistoryActions } from './history'
import { createImportExportActions } from './importExport'
import { createMutationActions } from './mutations'
import { createBookmarkStore } from './store'

export const useBookmarks = () => {
  const store = createBookmarkStore()

  return {
    bookmarks: store.bookmarks,
    categories: store.categories,
    categorySummaries: store.categorySummaries,
    tagSummaries: store.tagSummaries,
    cleanupSummary: store.cleanupSummary,
    backups: store.backups,
    undoSnapshots: store.undoSnapshots,
    settings: store.settings,
    storageUsage: store.storageUsage,
    loadDeferredData: store.loadDeferredData,
    ...createDraftActions(store),
    ...createMutationActions(store),
    ...createCategoryActions(store),
    ...createDockActions(store),
    ...createCleanupActions(store),
    ...createHistoryActions(store),
    ...createImportExportActions(store),
  }
}
