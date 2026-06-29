<script setup lang="ts">
import type { SearchScope } from '@/features/bookmarks/composables/useBookmarkFilter'

const model = defineModel<string>({ required: true })
const scope = defineModel<SearchScope>('scope', { required: true })
const currentOnly = defineModel<boolean>('currentOnly', { required: true })

defineProps<{
  resultCount: number
  history: string[]
  hasActiveCategory: boolean
}>()

defineEmits<{
  commit: []
  clearHistory: []
}>()

const scopeOptions: Array<{ value: SearchScope; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'title', label: '标题' },
  { value: 'domain', label: '域名' },
  { value: 'category', label: '分类' },
  { value: 'tag', label: '标签' },
]
</script>

<template>
  <div :class="['search-wrap', { 'has-query': model.trim() }]">
    <svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      id="bookmark-search"
      v-model="model"
      type="text"
      placeholder="搜索书签..."
      autocomplete="off"
      spellcheck="false"
      list="search-history"
      @keydown.enter="$emit('commit')"
    />
    <datalist id="search-history">
      <option v-for="item in history" :key="item" :value="item"></option>
    </datalist>
    <select v-model="scope" class="search-scope" aria-label="搜索范围">
      <option v-for="option in scopeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
    <label v-if="hasActiveCategory" class="search-current" title="仅搜索当前分类">
      <input v-model="currentOnly" type="checkbox" />
      当前
    </label>
    <button v-if="history.length" class="search-clear" type="button" title="清除搜索历史" @click="$emit('clearHistory')">
      ×
    </button>
    <span class="rc">{{ resultCount }} 结果</span>
    <span class="sb"><kbd>/</kbd><kbd>↑↓</kbd><kbd>↵</kbd></span>
  </div>
</template>
