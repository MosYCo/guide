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

const emit = defineEmits<{
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

const menuActions = {
  manageCategories: () => emit('manageCategories'),
  openCleanup: () => emit('openCleanup'),
  openBackups: () => emit('openBackups'),
  openSettings: () => emit('openSettings'),
  toggleHelp: () => emit('toggleHelp'),
  import: () => emit('import'),
  export: () => emit('export'),
  exportHtml: () => emit('exportHtml'),
} as const

const handleMenuCommand = (command: string) => {
  menuActions[command as keyof typeof menuActions]?.()
}
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <span class="brand-dot"></span>
      {{ appName }}
    </div>

    <ThemeButton :theme="theme" @cycle="$emit('cycleTheme')" />
    <el-button title="命令面板" @click="$emit('openCommands')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="13" height="13">
        <path d="M4 7h16M4 12h16M4 17h10" />
      </svg>
      <span class="lbl">命令</span>
      <kbd>⌘K</kbd>
    </el-button>
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
      <el-button :disabled="!canUndo" title="撤销上次更改" circle @click="$emit('undo')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="13" height="13">
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10a6 6 0 0 1 0 12h-1" />
        </svg>
      </el-button>
      <el-dropdown trigger="click" @command="handleMenuCommand">
        <el-button title="更多操作" circle aria-label="更多操作">
          <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
          </svg>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="manageCategories">分类管理</el-dropdown-item>
            <el-dropdown-item command="openCleanup">整理工具</el-dropdown-item>
            <el-dropdown-item command="openBackups">备份恢复</el-dropdown-item>
            <el-dropdown-item command="openSettings">设置</el-dropdown-item>
            <el-dropdown-item command="toggleHelp">键盘快捷键</el-dropdown-item>
            <el-dropdown-item command="import" divided>导入书签…</el-dropdown-item>
            <el-dropdown-item command="export">导出 JSON</el-dropdown-item>
            <el-dropdown-item command="exportHtml">导出浏览器书签 HTML</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-button type="primary" @click="$emit('add')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="13" height="13">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span class="lbl">添加</span>
      </el-button>
    </div>
  </header>
</template>
