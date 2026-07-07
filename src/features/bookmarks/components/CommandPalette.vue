<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { Bookmark, BookmarkIconMode, TagSummary } from '../types'
import { getHostname } from '../utils'
import BookmarkIcon from './BookmarkIcon.vue'

type CommandPaletteItem =
  | { id: string; type: 'bookmark'; label: string; meta: string; bookmark: Bookmark }
  | { id: string; type: 'category'; label: string; meta: string; category: string }
  | { id: string; type: 'tag'; label: string; meta: string; tag: string }
  | {
      id: string
      type: 'action'
      label: string
      meta: string
      action:
        | 'add'
        | 'clearFilters'
        | 'manageCategories'
        | 'openCleanup'
        | 'openBackups'
        | 'openSettings'
        | 'import'
        | 'exportJson'
        | 'exportHtml'
        | 'undo'
    }

const props = defineProps<{
  open: boolean
  bookmarks: Bookmark[]
  categories: string[]
  tags: TagSummary[]
  undoCount: number
  iconMode: BookmarkIconMode
}>()

const emit = defineEmits<{
  close: []
  openBookmark: [bookmark: Bookmark]
  add: []
  setCategory: [category: string | null]
  setTag: [tag: string | null]
  clearFilters: []
  manageCategories: []
  openCleanup: []
  openBackups: []
  openSettings: []
  import: []
  exportJson: []
  exportHtml: []
  undo: []
}>()

const query = ref('')
const activeIndex = ref(0)
const input = ref<HTMLInputElement>()
let previousFocus: HTMLElement | null = null

const actionItems = computed<CommandPaletteItem[]>(() => [
  { id: 'action:add', type: 'action', label: '添加书签', meta: '新建本地书签', action: 'add' },
  {
    id: 'action:undo',
    type: 'action',
    label: '撤销上次更改',
    meta: props.undoCount ? `${props.undoCount} 步可撤销` : '暂无可撤销操作',
    action: 'undo',
  },
  {
    id: 'action:clear',
    type: 'action',
    label: '清除筛选',
    meta: '回到全部书签',
    action: 'clearFilters',
  },
  {
    id: 'action:categories',
    type: 'action',
    label: '分类管理',
    meta: '排序、合并、隐藏',
    action: 'manageCategories',
  },
  {
    id: 'action:cleanup',
    type: 'action',
    label: '整理工具',
    meta: '重复、低频、长期未访问',
    action: 'openCleanup',
  },
  {
    id: 'action:backups',
    type: 'action',
    label: '备份恢复',
    meta: '查看本地快照',
    action: 'openBackups',
  },
  {
    id: 'action:settings',
    type: 'action',
    label: '设置',
    meta: '图标隐私与本地存储',
    action: 'openSettings',
  },
  {
    id: 'action:import',
    type: 'action',
    label: '导入书签',
    meta: 'JSON 或浏览器 HTML',
    action: 'import',
  },
  {
    id: 'action:export-json',
    type: 'action',
    label: '导出 JSON',
    meta: '完整 Navhub 数据',
    action: 'exportJson',
  },
  {
    id: 'action:export-html',
    type: 'action',
    label: '导出 HTML',
    meta: '浏览器书签文件',
    action: 'exportHtml',
  },
])

const items = computed<CommandPaletteItem[]>(() => {
  const normalizedQuery = query.value.trim().toLowerCase()
  const bookmarks = props.bookmarks.map<CommandPaletteItem>((bookmark) => ({
    id: `bookmark:${bookmark.id}`,
    type: 'bookmark',
    label: bookmark.title,
    meta: `${getHostname(bookmark.url)} · ${bookmark.cat}`,
    bookmark,
  }))
  const categories = props.categories.map<CommandPaletteItem>((category) => ({
    id: `category:${category}`,
    type: 'category',
    label: category,
    meta: '分类',
    category,
  }))
  const tags = props.tags.map<CommandPaletteItem>((tag) => ({
    id: `tag:${tag.name}`,
    type: 'tag',
    label: `#${tag.name}`,
    meta: `${tag.count} 个书签`,
    tag: tag.name,
  }))
  const allItems = [...bookmarks, ...categories, ...tags, ...actionItems.value]

  if (!normalizedQuery) return allItems.slice(0, 18)

  return allItems
    .filter((item) => `${item.label} ${item.meta}`.toLowerCase().includes(normalizedQuery))
    .slice(0, 18)
})

const close = () => {
  emit('close')
}

const runItem = (item: CommandPaletteItem) => {
  if (item.type === 'bookmark') {
    emit('openBookmark', item.bookmark)
    close()
    return
  }

  if (item.type === 'category') {
    emit('setCategory', item.category)
    close()
    return
  }

  if (item.type === 'tag') {
    emit('setTag', item.tag)
    close()
    return
  }

  if (item.action === 'add') emit('add')
  if (item.action === 'undo') emit('undo')
  if (item.action === 'clearFilters') emit('clearFilters')
  if (item.action === 'manageCategories') emit('manageCategories')
  if (item.action === 'openCleanup') emit('openCleanup')
  if (item.action === 'openBackups') emit('openBackups')
  if (item.action === 'openSettings') emit('openSettings')
  if (item.action === 'import') emit('import')
  if (item.action === 'exportJson') emit('exportJson')
  if (item.action === 'exportHtml') emit('exportHtml')
  close()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, Math.max(items.value.length - 1, 0))
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    const item = items.value[activeIndex.value]
    if (item) runItem(item)
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      query.value = ''
      activeIndex.value = 0
      nextTick(() => input.value?.focus())
    } else {
      previousFocus?.focus()
      previousFocus = null
    }
  },
)

watch(items, () => {
  activeIndex.value = Math.min(activeIndex.value, Math.max(items.value.length - 1, 0))
})
</script>

<template>
  <el-dialog
    :model-value="open"
    :show-close="false"
    width="620px"
    top="min(14vh, 120px)"
    class="command-dialog"
    @close="close"
  >
    <template #header>
      <div class="command-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="17" height="17">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <el-input
          ref="input"
          v-model="query"
          placeholder="搜索书签、分类、标签或命令"
          autocomplete="off"
          spellcheck="false"
          @keydown="handleKeydown"
        />
      </div>
    </template>
    <div class="command-list" role="listbox">
      <button
        v-for="(item, index) in items"
        :key="item.id"
        :class="['command-item', { active: index === activeIndex }]"
        type="button"
        role="option"
        :aria-selected="index === activeIndex"
        @mouseenter="activeIndex = index"
        @click="runItem(item)"
      >
        <BookmarkIcon
          v-if="item.type === 'bookmark'"
          :bookmark="item.bookmark"
          :icon-mode="iconMode"
        />
        <span v-else :class="['command-glyph', `command-glyph-${item.type}`]">
          {{ item.type === 'category' ? 'C' : item.type === 'tag' ? '#' : '⌘' }}
        </span>
        <span class="command-copy">
          <span class="command-label">{{ item.label }}</span>
          <span class="command-meta">{{ item.meta }}</span>
        </span>
      </button>
      <el-empty v-if="!items.length" description="没有匹配项" :image-size="60" />
    </div>
  </el-dialog>
</template>
