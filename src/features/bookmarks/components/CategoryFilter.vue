<script setup lang="ts">
import { computed } from 'vue'
import { CATEGORY_COLORS, UNCATEGORIZED_CATEGORY } from '../constants'
import type { Bookmark, BookmarkSortMode, TagSummary } from '../types'

const sortOptions: Array<{ value: BookmarkSortMode; label: string }> = [
  { value: 'default', label: '默认' },
  { value: 'smart', label: '智能' },
  { value: 'recent', label: '最近' },
  { value: 'frequent', label: '高频' },
  { value: 'stale', label: '未访问' },
]

const props = defineProps<{
  bookmarks: Bookmark[]
  categories: string[]
  activeCategory: string | null
  tags: TagSummary[]
  activeTag: string | null
  sortMode: BookmarkSortMode
}>()

defineEmits<{
  select: [category: string | null]
  selectTag: [tag: string | null]
  updateSort: [sortMode: BookmarkSortMode]
  delete: [category: string]
}>()

const categoryCounts = computed(() => {
  return props.bookmarks.reduce<Record<string, number>>((counts, bookmark) => {
    counts[bookmark.cat] = (counts[bookmark.cat] ?? 0) + 1
    return counts
  }, {})
})
</script>

<template>
  <div class="filter-shell">
    <div class="filter-bar">
      <button
        :class="['f-tab', { active: activeCategory === null }]"
        @click="$emit('select', null)"
      >
        <span class="ft-dot" style="background: var(--accent)"></span>
        全部
        <span class="ft-n">{{ bookmarks.length }}</span>
      </button>
      <span
        v-for="category in categories"
        :key="category"
        :class="['f-tab-wrap', { active: activeCategory === category }]"
      >
        <button class="f-tab" @click="$emit('select', category)">
          <span
            class="ft-dot"
            :style="{ background: CATEGORY_COLORS[category] || 'var(--muted)' }"
          ></span>
          <span class="ft-name">{{ category }}</span>
          <span class="ft-n">{{ categoryCounts[category] ?? 0 }}</span>
        </button>
        <button
          v-if="category !== UNCATEGORIZED_CATEGORY"
          class="ft-delete"
          :aria-label="`删除分类 ${category}`"
          :title="`删除分类 ${category}`"
          @click="$emit('delete', category)"
        >
          ×
        </button>
      </span>
    </div>

    <div class="filter-tools">
      <div v-if="tags.length" class="tag-strip" aria-label="标签筛选">
        <button
          :class="['tag-chip', { active: activeTag === null }]"
          @click="$emit('selectTag', null)"
        >
          全部标签
        </button>
        <button
          v-for="tag in tags.slice(0, 12)"
          :key="tag.name"
          :class="['tag-chip', { active: activeTag === tag.name }]"
          @click="$emit('selectTag', tag.name)"
        >
          #{{ tag.name }}
          <span>{{ tag.count }}</span>
        </button>
      </div>

      <div class="sort-tabs" aria-label="书签排序">
        <button
          v-for="option in sortOptions"
          :key="option.value"
          :class="{ active: sortMode === option.value }"
          @click="$emit('updateSort', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
  </div>
</template>
