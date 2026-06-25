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
  removeBookmark,
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

const isEditing = computed(() => Boolean(editingId.value))

const handleSave = () => {
  const savedTitle = draft.value.title.trim()
  if (!saveDraft()) {
    showToast('名称和网址不能为空')
    return
  }

  showToast(isEditing.value ? '已更新' : `已添加 ${savedTitle}`)
}

const handleDelete = (bookmark: Bookmark) => {
  if (window.confirm(`删除「${bookmark.title}」？`)) {
    removeBookmark(bookmark.id)
    showToast(`已删除 ${bookmark.title}`)
  }
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

const addCategory = (category: string) => {
  draft.value.cat = category
}

const { focusedId, clearFocus } = useBookmarkKeyboard({
  query,
  activeCategory,
  categories,
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
      :theme="currentTheme"
      :result-count="filteredBookmarks.length"
      :time="time"
      @add="openAddModal"
      @export="handleExport"
      @toggle-help="isHelpOpen = !isHelpOpen"
      @cycle-theme="
        cycleTheme();
        showToast(`主题：${currentTheme.label}`)
      "
    />

    <HeroDock :bookmarks="bookmarks" />

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
