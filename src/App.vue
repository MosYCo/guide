<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BookmarkSection from '@/features/bookmarks/components/BookmarkSection.vue'
import CategoryFilter from '@/features/bookmarks/components/CategoryFilter.vue'
import HeroDock from '@/features/bookmarks/components/HeroDock.vue'

const BookmarkModal = defineAsyncComponent(
  () => import('@/features/bookmarks/components/BookmarkModal.vue'),
)
const BackupPanel = defineAsyncComponent(
  () => import('@/features/bookmarks/components/BackupPanel.vue'),
)
const CategoryManager = defineAsyncComponent(
  () => import('@/features/bookmarks/components/CategoryManager.vue'),
)
const CleanupPanel = defineAsyncComponent(
  () => import('@/features/bookmarks/components/CleanupPanel.vue'),
)
const CommandPalette = defineAsyncComponent(
  () => import('@/features/bookmarks/components/CommandPalette.vue'),
)
const SettingsPanel = defineAsyncComponent(
  () => import('@/features/bookmarks/components/SettingsPanel.vue'),
)
import { useBookmarkFilter } from '@/features/bookmarks/composables/useBookmarkFilter'
import { useBookmarkKeyboard } from '@/features/bookmarks/composables/useBookmarkKeyboard'
import { useBookmarks } from '@/features/bookmarks/composables/useBookmarks'
import type {
  Bookmark,
  BookmarkIconMode,
  DockDropPlacement,
  DockMoveDirection,
} from '@/features/bookmarks/types'
import AppTopbar from '@/shared/components/AppTopbar.vue'

const KeyboardHelp = defineAsyncComponent(
  () => import('@/shared/components/KeyboardHelp.vue'),
)
import { APP_NAME } from '@/shared/config/app'
import { useClock } from '@/shared/composables/useClock'
import { useTheme } from '@/shared/composables/useTheme'

const {
  bookmarks,
  categories,
  categorySummaries,
  tagSummaries,
  cleanupSummary,
  backups,
  undoSnapshots,
  settings,
  storageUsage,
  draft,
  editingId,
  isModalOpen,
  openAddModal,
  openEditModal,
  closeModal,
  saveDraft,
  importBookmarks,
  exportBookmarksAsHtml,
  recordBookmarkVisit,
  undoLastChange,
  removeBookmark,
  deleteCategory,
  bulkMoveCategory,
  bulkSetPinned,
  bulkDelete,
  renameCategory,
  mergeCategory,
  moveCategory,
  setCategoryHidden,
  unpinBookmark,
  toggleBookmarkPin,
  reorderPinnedBookmarks,
  movePinnedBookmarkByDirection,
  exportBookmarks,
  exportSelectedBookmarks,
  restoreBackup,
  setIconMode,
  clearBackups,
  cleanupEmptyCategories,
  removeLowFrequencyTags,
  removeStaleBookmarks,
  deduplicateBookmarks,
  loadDeferredData,
} = useBookmarks()

const {
  query,
  activeCategory,
  activeTag,
  searchScope,
  searchCurrentCategoryOnly,
  sortMode,
  searchHistory,
  collapsedCategories,
  filteredBookmarks,
  groupedBookmarks,
  setCategory,
  setTag,
  clearFilters,
  commitSearch,
  clearSearchHistory,
  toggleCategoryCollapsed,
} = useBookmarkFilter(bookmarks)

const { currentTheme, cycleTheme } = useTheme()
const { time } = useClock()
const toast = (text: string) => ElMessage({ message: text, grouping: true })
const isHelpOpen = ref(false)
const isCategoryManagerOpen = ref(false)
const isBackupPanelOpen = ref(false)
const isCleanupPanelOpen = ref(false)
const isSettingsPanelOpen = ref(false)
const isCommandPaletteOpen = ref(false)
const updateRegistration = ref<ServiceWorkerRegistration | null>(null)
const importInput = ref<HTMLInputElement | null>(null)
const selectedIds = ref<string[]>([])

const isEditing = computed(() => Boolean(editingId.value))
const canUndo = computed(() => undoSnapshots.value.length > 0)
const isOverlayOpen = computed(
  () =>
    isModalOpen.value ||
    isHelpOpen.value ||
    isCategoryManagerOpen.value ||
    isBackupPanelOpen.value ||
    isCleanupPanelOpen.value ||
    isSettingsPanelOpen.value ||
    isCommandPaletteOpen.value,
)

document.title = APP_NAME

let previousBodyOverflow = ''

watch(
  isOverlayOpen,
  (open) => {
    if (open) {
      if (!previousBodyOverflow) previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return
    }

    document.body.style.overflow = previousBodyOverflow
    previousBodyOverflow = ''
  },
  { immediate: true },
)

const handleSave = () => {
  const result = saveDraft()
  if (!result.ok) {
    toast(result.reason)
    return
  }

  toast(result.created ? `已添加 ${result.bookmark.title}` : '已更新')
}

const handleDelete = async (bookmark: Bookmark) => {
  try {
    await ElMessageBox.confirm('该书签会从本地列表中移除。', `删除 ${bookmark.title}`, {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    const result = removeBookmark(bookmark.id)
    if (!result.ok) {
      toast(result.reason)
      return
    }
    toast(`已删除 ${bookmark.title}`)
  } catch {
    // cancelled
  }
}

const toggleSelect = (bookmark: Bookmark) => {
  selectedIds.value = selectedIds.value.includes(bookmark.id)
    ? selectedIds.value.filter((id) => id !== bookmark.id)
    : [...selectedIds.value, bookmark.id]
}

const clearSelection = () => {
  selectedIds.value = []
}

const handleUnpin = (bookmark: Bookmark) => {
  const result = unpinBookmark(bookmark.id)
  if (!result.ok) {
    toast(result.reason)
    return
  }

  toast(`已从快速启动移除 ${result.bookmark.title}`)
}

const handleDeleteCategory = async (category: string) => {
  const count = bookmarks.value.filter((bookmark) => bookmark.cat === category).length
  const message =
    count > 0
      ? `该分类下 ${count} 个书签会移动到「未分类」。`
      : '该空分类会从分类筛选中移除。'
  try {
    await ElMessageBox.confirm(message, `删除分类 ${category}`, {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    const result = deleteCategory(category)
    if (!result.ok) {
      toast(result.reason)
      return
    }
    if (activeCategory.value === category) {
      setCategory(null)
      clearFocus()
    }
    toast(result.moved > 0 ? `已删除分类，${result.moved} 个书签移到未分类` : `已删除分类 ${category}`)
  } catch {
    // cancelled
  }
}

const handleSelectCategory = (category: string | null) => {
  setCategory(category)
  clearFocus()
}

const handleSelectTag = (tag: string | null) => {
  setTag(tag)
  clearFocus()
}

const handleCommandSelectCategory = (category: string | null) => {
  setCategory(category)
  setTag(null)
  clearFocus()
}

const handleClearFilters = () => {
  clearFilters()
  clearFocus()
}

const handleDockReorder = (draggedId: string, targetId: string, placement: DockDropPlacement) => {
  const result = reorderPinnedBookmarks(draggedId, targetId, placement)
  if (!result.ok) {
    toast(result.reason)
  }
}

const handleDockMove = (bookmark: Bookmark, direction: DockMoveDirection) => {
  const result = movePinnedBookmarkByDirection(bookmark.id, direction)
  if (!result.ok) {
    toast(result.reason)
  }
}

const handleTogglePin = (bookmark: Bookmark) => {
  const result = toggleBookmarkPin(bookmark.id)
  if (!result.ok) {
    toast(result.reason)
    return
  }
  toast(
    result.bookmark.pin ? `已固定 ${result.bookmark.title}` : `已取消固定 ${result.bookmark.title}`,
  )
}

const handleBulkMove = (category: string) => {
  if (!category) return

  const result = bulkMoveCategory(selectedIds.value, category)
  if (!result.ok) {
    toast(result.reason)
    return
  }
  toast(`已移动 ${result.count} 个书签`)
  clearSelection()
}

const handleBulkMoveChange = (event: Event) => {
  const select = event.target as HTMLSelectElement
  handleBulkMove(select.value)
  select.value = ''
}

const handleBulkPin = (pin: boolean) => {
  const result = bulkSetPinned(selectedIds.value, pin)
  if (!result.ok) {
    toast(result.reason)
    return
  }
  toast(pin ? `已固定 ${result.count} 个书签到 Dock` : `已取消 ${result.count} 个 Dock 固定`)
  clearSelection()
}

const handleExport = () => {
  downloadBookmarks(exportBookmarks())
  toast(`已导出 ${bookmarks.value.length} 个书签`)
}

const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const downloadBookmarks = (data: unknown, filename = 'navhub-bookmarks.json') => {
  downloadFile(JSON.stringify(data, null, 2), filename, 'application/json')
}

const handleExportSelected = () => {
  downloadBookmarks(exportSelectedBookmarks(selectedIds.value), 'navhub-selected-bookmarks.json')
  toast(`已导出 ${selectedIds.value.length} 个选中书签`)
}

const handleExportHtml = () => {
  downloadFile(exportBookmarksAsHtml(), 'navhub-bookmarks.html', 'text/html;charset=utf-8')
  toast(`已导出 HTML：${bookmarks.value.length} 个书签`)
}

const handleExportSelectedHtml = () => {
  downloadFile(
    exportBookmarksAsHtml(selectedIds.value),
    'navhub-selected-bookmarks.html',
    'text/html;charset=utf-8',
  )
  toast(`已导出 HTML：${selectedIds.value.length} 个选中书签`)
}

const handleImportClick = () => {
  importInput.value?.click()
}

const handleImport = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file) return

  const result = importBookmarks(await file.text())
  if (!result.ok) {
    toast(`导入失败：${result.reason}`)
    return
  }

  toast(`导入完成：新增 ${result.added}，更新 ${result.updated}，跳过 ${result.skipped}`)
}

const handleOpenBookmark = (bookmark: Bookmark) => {
  const result = recordBookmarkVisit(bookmark.id)
  if (!result.ok) {
    toast(result.reason)
  }
}

const handleCommandOpenBookmark = (bookmark: Bookmark) => {
  const result = recordBookmarkVisit(bookmark.id)
  if (!result.ok) {
    toast(result.reason)
    return
  }

  window.open(bookmark.url, '_blank', 'noopener')
}

const handleUndo = () => {
  const result = undoLastChange()
  if (!result.ok) {
    toast(result.reason)
    return
  }

  toast(`已撤销：${result.label}`)
  clearSelection()
}

const handleCycleTheme = () => {
  cycleTheme()
  toast(`主题：${currentTheme.value.label}`)
}

const requestCategory = async () => {
  try {
    const { value } = await ElMessageBox.prompt('例如：阅读', '新建分类', {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      inputPattern: /\S/,
      inputErrorMessage: '分类名称不能为空',
    })
    draft.value.cat = value.trim()
  } catch {
    // cancelled
  }
}

const handleBulkDelete = async () => {
  try {
    await ElMessageBox.confirm(
      '选中的书签会从本地列表中移除，操作前会自动创建备份。',
      `删除 ${selectedIds.value.length} 个书签`,
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
    const result = bulkDelete(selectedIds.value)
    if (!result.ok) {
      toast(result.reason)
      return
    }
    toast(`已删除 ${result.count} 个书签`)
    clearSelection()
  } catch {
    // cancelled
  }
}

const handleRestoreBackup = async (id: string) => {
  try {
    await ElMessageBox.confirm('当前数据会先自动备份，然后恢复所选快照。', '恢复备份', {
      confirmButtonText: '恢复',
      cancelButtonText: '取消',
      type: 'info',
    })
    const result = restoreBackup(id)
    if (!result.ok) {
      toast(result.reason)
      return
    }
    toast('已恢复备份')
    isBackupPanelOpen.value = false
    clearSelection()
  } catch {
    // cancelled
  }
}

const { focusedId, clearFocus } = useBookmarkKeyboard({
  query,
  activeCategory,
  categories,
  bookmarks: filteredBookmarks,
  modalOpen: isModalOpen,
  helpOpen: isHelpOpen,
  commandOpen: isCommandPaletteOpen,
  onAdd: openAddModal,
  onClearCategory: clearFilters,
  onSelectCategory: setCategory,
  onCloseModal: closeModal,
  onCloseHelp: () => {
    isHelpOpen.value = false
  },
  onOpenHelp: () => {
    isHelpOpen.value = true
  },
  onCycleTheme: handleCycleTheme,
  onEdit: openEditModal,
  onDelete: handleDelete,
  onTogglePin: handleTogglePin,
  onOpenBookmark: handleOpenBookmark,
  onMoveDock: (bookmark, direction) => {
    handleDockMove(bookmark, direction)
  },
})

const handleCategoryAction = (
  action: () => { ok: true } | { ok: false; reason: string },
  success: string,
) => {
  const result = action()
  if (!result.ok) {
    toast(result.reason)
    return
  }
  toast(success)
}

const handleCategoryRename = (from: string, to: string) => {
  handleCategoryAction(() => renameCategory(from, to), '已重命名分类')
}

const handleCategoryMerge = (from: string, to: string) => {
  handleCategoryAction(() => mergeCategory(from, to), '已合并分类')
}

const handleCategoryMove = (category: string, direction: DockMoveDirection) => {
  handleCategoryAction(() => moveCategory(category, direction), '已调整分类顺序')
}

const handleCategoryHidden = (category: string, hidden: boolean) => {
  handleCategoryAction(() => setCategoryHidden(category, hidden), '已更新分类状态')
}

const handleIconMode = async (mode: BookmarkIconMode) => {
  if (mode === settings.value.iconMode) return

  const labels: Record<BookmarkIconMode, string> = {
    text: '文本图标',
    direct: '站点 favicon',
    google: 'Google favicon',
  }
  try {
    await ElMessageBox.confirm(
      `确认切换为「${labels[mode]}」？外部 favicon 模式可能会发起图标网络请求。`,
      '切换图标来源',
      { confirmButtonText: '切换', cancelButtonText: '取消', type: 'info' },
    )
    applyIconMode(mode)
  } catch {
    // cancelled
  }
}

const applyIconMode = (mode: BookmarkIconMode) => {
  const result = setIconMode(mode)
  if (!result.ok) {
    toast(result.reason)
    return
  }
  const labels: Record<BookmarkIconMode, string> = {
    text: '文本图标',
    direct: '站点 favicon',
    google: 'Google favicon',
  }
  toast(`图标来源：${labels[mode]}`)
}

const handleCleanupAction = (
  action: () => { ok: true; count: number } | { ok: false; reason: string },
  success: (count: number) => string,
) => {
  const result = action()
  if (!result.ok) {
    toast(result.reason)
    return
  }
  toast(success(result.count))
  clearSelection()
}

const handleClearBackups = () => {
  handleCleanupAction(clearBackups, (count) => `已清空 ${count} 个备份`)
}

const handleDeduplicate = () => {
  handleCleanupAction(deduplicateBookmarks, (count) => `已合并重复书签，移除 ${count} 个`)
}

const handleRemoveStale = () => {
  handleCleanupAction(removeStaleBookmarks, (count) => `已删除 ${count} 个长期未访问书签`)
}

const handleCleanupEmptyCategories = () => {
  handleCleanupAction(cleanupEmptyCategories, (count) => `已清理 ${count} 个空分类`)
}

const handleRemoveLowFrequencyTags = () => {
  handleCleanupAction(removeLowFrequencyTags, (count) => `已移除 ${count} 个低频标签`)
}

const handleGlobalCommandKey = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    isCommandPaletteOpen.value = true
  }
}

const handleUpdateAvailable = (event: Event) => {
  const customEvent = event as CustomEvent<{ registration: ServiceWorkerRegistration }>
  updateRegistration.value = customEvent.detail.registration
}

const applyAppUpdate = () => {
  const worker = updateRegistration.value?.waiting
  if (!worker) {
    window.location.reload()
    return
  }

  worker.postMessage({ type: 'SKIP_WAITING' })
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalCommandKey)
  window.addEventListener('navhub:update-available', handleUpdateAvailable)
  loadDeferredData()
  requestAnimationFrame(() => document.body.classList.add('noise-ready'))
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleGlobalCommandKey)
  window.removeEventListener('navhub:update-available', handleUpdateAvailable)
  document.body.style.overflow = previousBodyOverflow
})
</script>

<template>
  <div class="shell">
    <div v-if="updateRegistration" class="update-banner">
      <span>发现新版本</span>
      <button class="mini-btn" @click="applyAppUpdate">刷新</button>
      <button class="mini-btn" @click="updateRegistration = null">稍后</button>
    </div>

    <AppTopbar
      v-model:query="query"
      v-model:search-scope="searchScope"
      v-model:search-current-only="searchCurrentCategoryOnly"
      :app-name="APP_NAME"
      :theme="currentTheme"
      :result-count="filteredBookmarks.length"
      :time="time"
      :search-history="searchHistory"
      :has-active-category="activeCategory !== null"
      :can-undo="canUndo"
      @add="openAddModal"
      @open-commands="isCommandPaletteOpen = true"
      @manage-categories="isCategoryManagerOpen = true"
      @open-cleanup="isCleanupPanelOpen = true"
      @open-backups="isBackupPanelOpen = true"
      @open-settings="isSettingsPanelOpen = true"
      @export="handleExport"
      @export-html="handleExportHtml"
      @import="handleImportClick"
      @undo="handleUndo"
      @commit-search="commitSearch"
      @clear-search-history="clearSearchHistory"
      @toggle-help="isHelpOpen = !isHelpOpen"
      @cycle-theme="handleCycleTheme"
    />

    <div v-if="selectedIds.length" class="bulk-bar">
      <span>已选择 {{ selectedIds.length }} 个</span>
      <select @change="handleBulkMoveChange">
        <option value="">移动到分类...</option>
        <option v-for="category in categories" :key="category" :value="category">
          {{ category }}
        </option>
      </select>
      <button class="btn" @click="handleBulkPin(true)">固定 Dock</button>
      <button class="btn" @click="handleBulkPin(false)">取消 Dock</button>
      <button class="btn" @click="handleExportSelected">导出选中</button>
      <button class="btn" @click="handleExportSelectedHtml">导出 HTML</button>
      <button
        class="btn btn-danger"
        @click="handleBulkDelete"
      >
        删除
      </button>
      <button class="btn" @click="clearSelection">取消选择</button>
    </div>

    <HeroDock
      :bookmarks="bookmarks"
      :icon-mode="settings.iconMode"
      @open="handleOpenBookmark"
      @edit="openEditModal"
      @unpin="handleUnpin"
      @reorder="handleDockReorder"
      @move="handleDockMove"
    />

    <CategoryFilter
      :bookmarks="bookmarks"
      :categories="categories"
      :active-category="activeCategory"
      :tags="tagSummaries"
      :active-tag="activeTag"
      :sort-mode="sortMode"
      @select="handleSelectCategory"
      @select-tag="handleSelectTag"
      @update-sort="sortMode = $event"
      @delete="handleDeleteCategory"
    />

    <BookmarkSection
      :groups="groupedBookmarks"
      :collapsed-categories="collapsedCategories"
      :focused-id="focusedId"
      :query="query"
      :selected-ids="selectedIds"
      :active-category="activeCategory"
      :icon-mode="settings.iconMode"
      @toggle="toggleCategoryCollapsed"
      @toggle-select="toggleSelect"
      @open="handleOpenBookmark"
      @edit="openEditModal"
      @delete="handleDelete"
      @add="openAddModal"
    />
  </div>

  <input
    ref="importInput"
    class="visually-hidden"
    type="file"
    accept="application/json,text/html,.json,.html,.htm"
    aria-label="导入书签 JSON 或 HTML"
    @change="handleImport"
  />

  <KeyboardHelp :open="isHelpOpen" @close="isHelpOpen = false" />
  <CategoryManager
    :open="isCategoryManagerOpen"
    :categories="categorySummaries"
    @close="isCategoryManagerOpen = false"
    @rename="handleCategoryRename"
    @merge="handleCategoryMerge"
    @move="handleCategoryMove"
    @hide="handleCategoryHidden"
    @delete="handleDeleteCategory"
  />
  <BackupPanel
    :open="isBackupPanelOpen"
    :backups="backups"
    @close="isBackupPanelOpen = false"
    @restore="handleRestoreBackup"
  />
  <CleanupPanel
    v-if="isCleanupPanelOpen"
    :open="isCleanupPanelOpen"
    :summary="cleanupSummary"
    @close="isCleanupPanelOpen = false"
    @deduplicate="handleDeduplicate"
    @remove-stale="handleRemoveStale"
    @cleanup-empty-categories="handleCleanupEmptyCategories"
    @remove-low-frequency-tags="handleRemoveLowFrequencyTags"
  />
  <SettingsPanel
    v-if="isSettingsPanelOpen"
    :open="isSettingsPanelOpen"
    :settings="settings"
    :storage-usage="storageUsage"
    :backup-count="backups.length"
    @close="isSettingsPanelOpen = false"
    @update-icon-mode="handleIconMode"
    @clear-backups="handleClearBackups"
  />
  <BookmarkModal
    v-model:draft="draft"
    :open="isModalOpen"
    :editing="isEditing"
    :categories="categories"
    @close="closeModal"
    @save="handleSave"
    @request-category="requestCategory"
  />
  <CommandPalette
    :open="isCommandPaletteOpen"
    :bookmarks="bookmarks"
    :categories="categories"
    :tags="tagSummaries"
    :undo-count="undoSnapshots.length"
    :icon-mode="settings.iconMode"
    @close="isCommandPaletteOpen = false"
    @open-bookmark="handleCommandOpenBookmark"
    @add="openAddModal"
    @set-category="handleCommandSelectCategory"
    @set-tag="handleSelectTag"
    @clear-filters="handleClearFilters"
    @manage-categories="isCategoryManagerOpen = true"
    @open-cleanup="isCleanupPanelOpen = true"
    @open-backups="isBackupPanelOpen = true"
    @open-settings="isSettingsPanelOpen = true"
    @import="handleImportClick"
    @export-json="handleExport"
    @export-html="handleExportHtml"
    @undo="handleUndo"
  />
</template>
