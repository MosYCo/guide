<script setup lang="ts">
import type { SearchScope } from '@/features/bookmarks/composables/useBookmarkFilter'
import type { ThemeDefinition } from '@/shared/composables/useTheme'
import ThemeButton from './ThemeButton.vue'
import SearchBox from './SearchBox.vue'

const query = defineModel<string>('query', { required: true })
const searchScope = defineModel<SearchScope>('searchScope', { required: true })
const searchCurrentOnly = defineModel<boolean>('searchCurrentOnly', { required: true })

defineProps<{
  appName: string
  theme: ThemeDefinition
  resultCount: number
  time: string
  searchHistory: string[]
  hasActiveCategory: boolean
  canUndo: boolean
}>()

defineEmits<{
  add: []
  openCommands: []
  manageCategories: []
  openCleanup: []
  openBackups: []
  openSettings: []
  import: []
  export: []
  exportHtml: []
  undo: []
  commitSearch: []
  clearSearchHistory: []
  toggleHelp: []
  cycleTheme: []
}>()
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <span class="brand-dot"></span>
      {{ appName }}
    </div>

    <ThemeButton :theme="theme" @cycle="$emit('cycleTheme')" />
    <button class="btn command-trigger" title="命令面板" @click="$emit('openCommands')">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      >
        <path d="M4 7h16M4 12h16M4 17h10" />
      </svg>
      <span class="lbl">命令</span>
      <kbd>⌘K</kbd>
    </button>
    <SearchBox
      v-model="query"
      v-model:scope="searchScope"
      v-model:current-only="searchCurrentOnly"
      :result-count="resultCount"
      :history="searchHistory"
      :has-active-category="hasActiveCategory"
      @commit="$emit('commitSearch')"
      @clear-history="$emit('clearSearchHistory')"
    />

    <div class="t-right">
      <span class="clock">{{ time }}</span>
      <span class="dot-sep"></span>
      <button class="btn btn-icon" :disabled="!canUndo" title="撤销上次更改" @click="$emit('undo')">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10a6 6 0 0 1 0 12h-1" />
        </svg>
      </button>
      <button class="btn btn-icon" title="分类管理" @click="$emit('manageCategories')">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
          <circle cx="8" cy="7" r="2" />
          <circle cx="14" cy="12" r="2" />
          <circle cx="10" cy="17" r="2" />
        </svg>
      </button>
      <button class="btn btn-icon" title="整理工具" @click="$emit('openCleanup')">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M4 7h16" />
          <path d="M7 12h10" />
          <path d="M10 17h4" />
        </svg>
      </button>
      <button class="btn btn-icon" title="备份恢复" @click="$emit('openBackups')">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M3 12a9 9 0 109-9" />
          <path d="M3 3v6h6" />
          <path d="M12 7v5l3 2" />
        </svg>
      </button>
      <button class="btn btn-icon" title="设置" @click="$emit('openSettings')">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z"
          />
        </svg>
      </button>
      <button class="btn btn-icon" title="键盘快捷键" @click="$emit('toggleHelp')">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
        </svg>
      </button>
      <button class="btn" title="导入 JSON" @click="$emit('import')">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span class="lbl">导入</span>
      </button>
      <button class="btn" title="导出 JSON" @click="$emit('export')">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span class="lbl">导出</span>
      </button>
      <button class="btn btn-icon" title="导出浏览器书签 HTML" @click="$emit('exportHtml')">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M4 4h16v16H4z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      </button>
      <button class="btn btn-acc" @click="$emit('add')">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span class="lbl">添加</span>
      </button>
    </div>
  </header>
</template>
