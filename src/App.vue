<script setup lang="ts">
import { computed, ref } from 'vue'
import BookmarkModal from '@/features/bookmarks/components/BookmarkModal.vue'
import BookmarkSection from '@/features/bookmarks/components/BookmarkSection.vue'
import BackupPanel from '@/features/bookmarks/components/BackupPanel.vue'
import CategoryFilter from '@/features/bookmarks/components/CategoryFilter.vue'
import CategoryManager from '@/features/bookmarks/components/CategoryManager.vue'
import HeroDock from '@/features/bookmarks/components/HeroDock.vue'
import { useBookmarkFilter } from '@/features/bookmarks/composables/useBookmarkFilter'
import { useBookmarkKeyboard } from '@/features/bookmarks/composables/useBookmarkKeyboard'
import { useBookmarks } from '@/features/bookmarks/composables/useBookmarks'
import type { Bookmark, DockDropPlacement, DockMoveDirection } from '@/features/bookmarks/types'
import AppTopbar from '@/shared/components/AppTopbar.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import KeyboardHelp from '@/shared/components/KeyboardHelp.vue'
import ToastHost from '@/shared/components/ToastHost.vue'
import { APP_NAME } from '@/shared/config/app'
import { useClock } from '@/shared/composables/useClock'
import { useTheme } from '@/shared/composables/useTheme'
import { useToast } from '@/shared/composables/useToast'

const {
  bookmarks,
  categories,
  categorySummaries,
  backups,
  draft,
  editingId,
  isModalOpen,
  openAddModal,
  openEditModal,
  closeModal,
  saveDraft,
  importBookmarks,
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
} = useBookmarks()

const {
  query,
  activeCategory,
  searchScope,
  searchCurrentCategoryOnly,
  searchHistory,
  collapsedCategories,
  filteredBookmarks,
  groupedBookmarks,
  setCategory,
  clearFilters,
  commitSearch,
  clearSearchHistory,
  toggleCategoryCollapsed,
} = useBookmarkFilter(bookmarks)

const { currentTheme, cycleTheme } = useTheme()
const { time } = useClock()
const { message, isVisible, showToast } = useToast()
const isHelpOpen = ref(false)
const isCategoryManagerOpen = ref(false)
const isBackupPanelOpen = ref(false)
const importInput = ref<HTMLInputElement | null>(null)
const selectedIds = ref<string[]>([])
const dialog = ref<
  | { type: 'deleteBookmark'; bookmark: Bookmark }
  | { type: 'deleteCategory'; category: string; count: number }
  | { type: 'bulkDelete'; count: number }
  | { type: 'restoreBackup'; id: string }
  | { type: 'addCategory' }
  | null
>(null)

const isEditing = computed(() => Boolean(editingId.value))
const dialogTitle = computed(() => {
  if (!dialog.value) return ''
  if (dialog.value.type === 'deleteBookmark') return `删除 ${dialog.value.bookmark.title}`
  if (dialog.value.type === 'deleteCategory') return `删除分类 ${dialog.value.category}`
  if (dialog.value.type === 'bulkDelete') return `删除 ${dialog.value.count} 个书签`
  if (dialog.value.type === 'restoreBackup') return '恢复备份'
  return '新建分类'
})
const dialogMessage = computed(() => {
  if (!dialog.value) return ''
  if (dialog.value.type === 'deleteBookmark') return '该书签会从本地列表中移除。'
  if (dialog.value.type === 'bulkDelete') return '选中的书签会从本地列表中移除，操作前会自动创建备份。'
  if (dialog.value.type === 'restoreBackup') return '当前数据会先自动备份，然后恢复所选快照。'
  if (dialog.value.type === 'deleteCategory') {
    return dialog.value.count > 0
      ? `该分类下 ${dialog.value.count} 个书签会移动到「未分类」。`
      : '该空分类会从分类筛选中移除。'
  }
  return ''
})

document.title = APP_NAME

const handleSave = () => {
  const result = saveDraft()
  if (!result.ok) {
    showToast(result.reason)
    return
  }

  showToast(result.created ? `已添加 ${result.bookmark.title}` : '已更新')
}

const handleDelete = (bookmark: Bookmark) => {
  dialog.value = { type: 'deleteBookmark', bookmark }
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
    showToast(result.reason)
    return
  }

  showToast(`已从快速启动移除 ${result.bookmark.title}`)
}

const handleDeleteCategory = (category: string) => {
  const count = bookmarks.value.filter((bookmark) => bookmark.cat === category).length
  dialog.value = { type: 'deleteCategory', category, count }
}

const handleDockReorder = (draggedId: string, targetId: string, placement: DockDropPlacement) => {
  const result = reorderPinnedBookmarks(draggedId, targetId, placement)
  if (!result.ok) {
    showToast(result.reason)
  }
}

const handleDockMove = (bookmark: Bookmark, direction: DockMoveDirection) => {
  const result = movePinnedBookmarkByDirection(bookmark.id, direction)
  if (!result.ok) {
    showToast(result.reason)
  }
}

const handleTogglePin = (bookmark: Bookmark) => {
  const result = toggleBookmarkPin(bookmark.id)
  if (!result.ok) {
    showToast(result.reason)
    return
  }
  showToast(result.bookmark.pin ? `已固定 ${result.bookmark.title}` : `已取消固定 ${result.bookmark.title}`)
}

const handleBulkMove = (category: string) => {
  if (!category) return

  const result = bulkMoveCategory(selectedIds.value, category)
  if (!result.ok) {
    showToast(result.reason)
    return
  }
  showToast(`已移动 ${result.count} 个书签`)
  clearSelection()
}

const handleBulkPin = (pin: boolean) => {
  const result = bulkSetPinned(selectedIds.value, pin)
  if (!result.ok) {
    showToast(result.reason)
    return
  }
  showToast(pin ? `已固定 ${result.count} 个书签到 Dock` : `已取消 ${result.count} 个 Dock 固定`)
  clearSelection()
}

const handleExport = () => {
  downloadBookmarks(exportBookmarks())
  showToast(`已导出 ${bookmarks.value.length} 个书签`)
}

const downloadBookmarks = (data: unknown, filename = 'navhub-bookmarks.json') => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const handleExportSelected = () => {
  downloadBookmarks(exportSelectedBookmarks(selectedIds.value), 'navhub-selected-bookmarks.json')
  showToast(`已导出 ${selectedIds.value.length} 个选中书签`)
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
    showToast(`导入失败：${result.reason}`)
    return
  }

  showToast(`导入完成：新增 ${result.added}，更新 ${result.updated}，跳过 ${result.skipped}`)
}

const addCategory = (category: string) => {
  draft.value.cat = category
}

const requestCategory = () => {
  dialog.value = { type: 'addCategory' }
}

const handleDialogConfirm = (value?: string) => {
  if (!dialog.value) return

  if (dialog.value.type === 'deleteBookmark') {
    const result = removeBookmark(dialog.value.bookmark.id)
    if (!result.ok) {
      showToast(result.reason)
      dialog.value = null
      return
    }
    showToast(`已删除 ${dialog.value.bookmark.title}`)
  }

  if (dialog.value.type === 'bulkDelete') {
    const result = bulkDelete(selectedIds.value)
    if (!result.ok) {
      showToast(result.reason)
      dialog.value = null
      return
    }
    showToast(`已删除 ${result.count} 个书签`)
    clearSelection()
  }

  if (dialog.value.type === 'deleteCategory') {
    const category = dialog.value.category
    const result = deleteCategory(category)
    if (!result.ok) {
      showToast(result.reason)
      dialog.value = null
      return
    }

    if (activeCategory.value === category) {
      setCategory(null)
      clearFocus()
    }

    showToast(result.moved > 0 ? `已删除分类，${result.moved} 个书签移到未分类` : `已删除分类 ${category}`)
  }

  if (dialog.value.type === 'addCategory') {
    const category = value?.trim()
    if (!category) {
      showToast('分类名称不能为空')
      return
    }

    addCategory(category)
  }

  if (dialog.value.type === 'restoreBackup') {
    const result = restoreBackup(dialog.value.id)
    if (!result.ok) {
      showToast(result.reason)
      dialog.value = null
      return
    }
    showToast('已恢复备份')
    isBackupPanelOpen.value = false
    clearSelection()
  }

  dialog.value = null
}

const { focusedId, clearFocus } = useBookmarkKeyboard({
  query,
  activeCategory,
  categories,
  bookmarks: filteredBookmarks,
  modalOpen: isModalOpen,
  helpOpen: isHelpOpen,
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
  onCycleTheme: () => {
    cycleTheme()
    showToast(`主题：${currentTheme.value.label}`)
  },
  onEdit: openEditModal,
  onDelete: handleDelete,
  onTogglePin: handleTogglePin,
  onMoveDock: (bookmark, direction) => {
    handleDockMove(bookmark, direction)
  },
})

const handleCategoryAction = (action: () => { ok: true } | { ok: false; reason: string }, success: string) => {
  const result = action()
  if (!result.ok) {
    showToast(result.reason)
    return
  }
  showToast(success)
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
</script>

<template>
  <div class="shell">
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
      @add="openAddModal"
      @manage-categories="isCategoryManagerOpen = true"
      @open-backups="isBackupPanelOpen = true"
      @export="handleExport"
      @import="handleImportClick"
      @commit-search="commitSearch"
      @clear-search-history="clearSearchHistory"
      @toggle-help="isHelpOpen = !isHelpOpen"
      @cycle-theme="
        cycleTheme();
        showToast(`主题：${currentTheme.label}`)
      "
    />

    <div v-if="selectedIds.length" class="bulk-bar">
      <span>已选择 {{ selectedIds.length }} 个</span>
      <select
        @change="
          handleBulkMove(($event.target as HTMLSelectElement).value);
          ($event.target as HTMLSelectElement).value = ''
        "
      >
        <option value="">移动到分类...</option>
        <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
      </select>
      <button class="btn" @click="handleBulkPin(true)">固定 Dock</button>
      <button class="btn" @click="handleBulkPin(false)">取消 Dock</button>
      <button class="btn" @click="handleExportSelected">导出选中</button>
      <button class="btn btn-danger" @click="dialog = { type: 'bulkDelete', count: selectedIds.length }">删除</button>
      <button class="btn" @click="clearSelection">取消选择</button>
    </div>

    <HeroDock
      :bookmarks="bookmarks"
      @edit="openEditModal"
      @unpin="handleUnpin"
      @reorder="handleDockReorder"
      @move="handleDockMove"
    />

    <CategoryFilter
      :bookmarks="bookmarks"
      :categories="categories"
      :active-category="activeCategory"
      @select="
        setCategory($event);
        clearFocus()
      "
      @delete="handleDeleteCategory"
    />

    <BookmarkSection
      :groups="groupedBookmarks"
      :collapsed-categories="collapsedCategories"
      :focused-id="focusedId"
      :query="query"
      :selected-ids="selectedIds"
      :active-category="activeCategory"
      @toggle="toggleCategoryCollapsed"
      @toggle-select="toggleSelect"
      @edit="openEditModal"
      @delete="handleDelete"
      @add="openAddModal"
    />
  </div>

  <input
    ref="importInput"
    class="visually-hidden"
    type="file"
    accept="application/json,.json"
    aria-label="导入书签 JSON"
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
    @restore="dialog = { type: 'restoreBackup', id: $event }"
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
  <ConfirmDialog
    :open="Boolean(dialog)"
    :title="dialogTitle"
    :message="dialogMessage"
    :tone="
      dialog?.type === 'deleteBookmark' || dialog?.type === 'deleteCategory' || dialog?.type === 'bulkDelete'
        ? 'danger'
        : 'default'
    "
    :confirm-label="dialog?.type === 'addCategory' ? '创建' : dialog?.type === 'restoreBackup' ? '恢复' : '删除'"
    :input-label="dialog?.type === 'addCategory' ? '分类名称' : ''"
    input-placeholder="例如：阅读"
    @cancel="dialog = null"
    @confirm="handleDialogConfirm"
  />
  <ToastHost :message="message" :visible="isVisible" />
</template>
