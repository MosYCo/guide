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
    <el-input
      :model-value="model"
      placeholder="搜索书签..."
      clearable
      @update:model-value="(val: string) => model = val"
      @keyup.enter="$emit('commit')"
    >
      <template #prefix>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </template>
      <template #append>
        <el-select
          :model-value="scope"
          style="width: 72px"
          @update:model-value="(val: string) => scope = val as SearchScope"
        >
          <el-option
            v-for="option in scopeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </template>
    </el-input>
    <el-checkbox
      v-if="hasActiveCategory"
      v-model="currentOnly"
      class="search-current"
      label="当前"
      size="small"
    />
    <el-button
      v-if="history.length"
      class="search-clear"
      :icon="undefined"
      size="small"
      circle
      title="清除搜索历史"
      @click="$emit('clearHistory')"
    >×</el-button>
    <span class="rc">{{ resultCount }} 结果</span>
    <span class="sb"><kbd>/</kbd><kbd>↑↓</kbd><kbd>↵</kbd></span>
  </div>
</template>
