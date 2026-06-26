<script setup lang="ts">
import { computed } from 'vue'
import { CATEGORY_COLORS } from '../constants'
import type { Bookmark } from '../types'

const props = defineProps<{
  bookmarks: Bookmark[]
  categories: string[]
  activeCategory: string | null
}>()

defineEmits<{
  select: [category: string | null]
}>()

const categoryCounts = computed(() => {
  return props.bookmarks.reduce<Record<string, number>>((counts, bookmark) => {
    counts[bookmark.cat] = (counts[bookmark.cat] ?? 0) + 1
    return counts
  }, {})
})
</script>

<template>
  <div class="filter-bar">
    <button :class="['f-tab', { active: activeCategory === null }]" @click="$emit('select', null)">
      <span class="ft-dot" style="background: var(--accent)"></span>
      全部
      <span class="ft-n">{{ bookmarks.length }}</span>
    </button>
    <button
      v-for="category in categories"
      :key="category"
      :class="['f-tab', { active: activeCategory === category }]"
      @click="$emit('select', category)"
    >
      <span class="ft-dot" :style="{ background: CATEGORY_COLORS[category] || 'var(--muted)' }"></span>
      {{ category }}
      <span class="ft-n">{{ categoryCounts[category] ?? 0 }}</span>
    </button>
  </div>
</template>
