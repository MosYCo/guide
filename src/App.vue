<script setup lang="ts">
import { computed, ref } from 'vue'
import BookmarkModal from '@/features/bookmarks/components/BookmarkModal.vue'
import BookmarkSection from '@/features/bookmarks/components/BookmarkSection.vue'
import CategoryFilter from '@/features/bookmarks/components/CategoryFilter.vue'
import HeroDock from '@/features/bookmarks/components/HeroDock.vue'
import { useBookmarkFilter } from '@/features/bookmarks/composables/useBookmarkFilter'
import { useBookmarkKeyboard } from '@/features/bookmarks/composables/useBookmarkKeyboard'
import { useBookmarks } from '@/features/bookmarks/composables/useBookmarks'
import type { Bookmark } from '@/features/bookmarks/types'
import AppTopbar from '@/shared/components/AppTopbar.vue'
import KeyboardHelp from '@/shared/components/KeyboardHelp.vue'
import ToastHost from '@/shared/components/ToastHost.vue'
import { APP_NAME } from '@/shared/config/app'
import { useClock } from '@/shared/composables/useClock'
import { useTheme } from '@/shared/composables/useTheme'
import { useToast } from '@/shared/composables/useToast'

const {
  bookmarks,
  categories,
  draft,
  editingId,
  isModalOpen,
  openAddModal,
  openEditModal,
  closeModal,
  saveDraft,
  importBookmarks,
  removeBookmark,
  unpinBookmark,
} = useBookmarks()

const {
  query,
  activeCategory,
  collapsedCategories,
  filteredBookmarks,
  groupedBookmarks,
  setCategory,
  clearFilters,
  toggleCategoryCollapsed,
} = useBookmarkFilter(bookmarks)

const { currentTheme, cycleTheme } = useTheme()
const { time } = useClock()
const { message, isVisible, showToast } = useToast()
const isHelpOpen = ref(false)
const importInput = ref<HTMLInputElement | null>(null)

const isEditing = computed(() => Boolean(editingId.value))

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
  if (window.confirm(`删除「${bookmark.title}」？`)) {
    removeBookmark(bookmark.id)
    showToast(`已删除 ${bookmark.title}`)
  }
}

const handleUnpin = (bookmark: Bookmark) => {
  const result = unpinBookmark(bookmark.id)
  if (!result.ok) {
    showToast(result.reason)
    return
  }

  showToast(`已从快速启动移除 ${result.bookmark.title}`)
}

const handleExport = () => {
  const blob = new Blob([JSON.stringify(bookmarks.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'navhub-bookmarks.json'
  link.click()
  URL.revokeObjectURL(url)
  showToast(`已导出 ${bookmarks.value.length} 个书签`)
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
  if (!result) {
    showToast('导入失败：JSON 格式或书签数据无效')
    return
  }

  showToast(`导入完成：新增 ${result.added}，更新 ${result.updated}，跳过 ${result.skipped}`)
}

const addCategory = (category: string) => {
  draft.value.cat = category
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
})
</script>

<template>
  <div class="shell">
    <AppTopbar
      v-model:query="query"
      :app-name="APP_NAME"
      :theme="currentTheme"
      :result-count="filteredBookmarks.length"
      :time="time"
      @add="openAddModal"
      @export="handleExport"
      @import="handleImportClick"
      @toggle-help="isHelpOpen = !isHelpOpen"
      @cycle-theme="
        cycleTheme();
        showToast(`主题：${currentTheme.label}`)
      "
    />

    <HeroDock :bookmarks="bookmarks" @edit="openEditModal" @unpin="handleUnpin" />

    <CategoryFilter
      :bookmarks="bookmarks"
      :categories="categories"
      :active-category="activeCategory"
      @select="
        setCategory($event);
        clearFocus()
      "
    />

    <BookmarkSection
      :groups="groupedBookmarks"
      :collapsed-categories="collapsedCategories"
      :focused-id="focusedId"
      :query="query"
      @toggle="toggleCategoryCollapsed"
      @edit="openEditModal"
      @delete="handleDelete"
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
  <BookmarkModal
    v-model:draft="draft"
    :open="isModalOpen"
    :editing="isEditing"
    :categories="categories"
    @close="closeModal"
    @save="handleSave"
    @add-category="addCategory"
  />
  <ToastHost :message="message" :visible="isVisible" />
</template>
