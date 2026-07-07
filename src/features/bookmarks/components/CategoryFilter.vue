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
    <el-tabs
      :model-value="activeCategory ?? '__all__'"
      type="card"
      @update:model-value="(val: string | number) => $emit('select', val === '__all__' ? null : val as string)"
    >
      <el-tab-pane name="__all__">
        <template #label>
          <span class="ft-dot" style="background: var(--accent)"></span>
          全部
          <span class="ft-n">{{ bookmarks.length }}</span>
        </template>
      </el-tab-pane>
      <el-tab-pane
        v-for="category in categories"
        :key="category"
        :name="category"
      >
        <template #label>
          <span
            class="ft-dot"
            :style="{ background: CATEGORY_COLORS[category] || 'var(--muted)' }"
          ></span>
          <span class="ft-name">{{ category }}</span>
          <span class="ft-n">{{ categoryCounts[category] ?? 0 }}</span>
          <el-tag
            v-if="category !== UNCATEGORIZED_CATEGORY"
            size="small"
            closable
            :disable-transitions="true"
            style="margin-left: 4px"
            @close.stop.prevent="$emit('delete', category)"
          />
        </template>
      </el-tab-pane>
    </el-tabs>

    <div class="filter-tools">
      <div v-if="tags.length" class="tag-strip" aria-label="标签筛选">
        <el-check-tag
          :checked="activeTag === null"
          @change="$emit('selectTag', null)"
        >
          全部标签
        </el-check-tag>
        <el-check-tag
          v-for="tag in tags.slice(0, 12)"
          :key="tag.name"
          :checked="activeTag === tag.name"
          @change="$emit('selectTag', tag.name)"
        >
          #{{ tag.name }}
          <span style="opacity: 0.6; margin-left: 2px">{{ tag.count }}</span>
        </el-check-tag>
      </div>

      <el-radio-group
        :model-value="sortMode"
        size="small"
        @update:model-value="(val: string | number | boolean) => $emit('updateSort', val as BookmarkSortMode)"
      >
        <el-radio-button
          v-for="option in sortOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </el-radio-button>
      </el-radio-group>
    </div>
  </div>
</template>
