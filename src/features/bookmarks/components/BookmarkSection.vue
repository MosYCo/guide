<script setup lang="ts">
import type { Bookmark, BookmarkGroup } from '../types'
import BookmarkCard from './BookmarkCard.vue'

defineProps<{
  groups: BookmarkGroup[]
  collapsedCategories: Record<string, boolean>
  focusedId: string | null
  query: string
  selectedIds: string[]
  activeCategory: string | null
}>()

defineEmits<{
  toggle: [category: string]
  toggleSelect: [bookmark: Bookmark]
  open: [bookmark: Bookmark]
  edit: [bookmark: Bookmark]
  delete: [bookmark: Bookmark]
  add: []
}>()
</script>

<template>
  <main class="content">
    <div v-if="!groups.length" class="empty">
      <div class="empty-s">∅</div>
      <p>
        {{
          query
            ? `没有匹配「${query}」`
            : activeCategory
              ? `「${activeCategory}」下没有书签`
              : '还没有书签'
        }}
      </p>
      <button v-if="!query" class="btn btn-acc" @click="$emit('add')">添加书签</button>
    </div>

    <section
      v-for="(group, groupIndex) in groups"
      v-else
      :key="group.name"
      :class="['cat', { collapsed: collapsedCategories[group.name] }]"
      :style="{ animationDelay: `${0.1 + groupIndex * 0.02}s` }"
    >
      <div class="cat-head" @click="$emit('toggle', group.name)">
        <span class="cat-label">{{ group.name }}</span>
        <span class="cat-rule"></span>
        <span class="cat-n">{{ group.items.length }}</span>
        <svg
          class="cat-ch"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <div class="cat-grid">
        <BookmarkCard
          v-for="bookmark in group.items"
          :key="bookmark.id"
          :bookmark="bookmark"
          :focused="focusedId === bookmark.id"
          :query="query"
          :selected="selectedIds.includes(bookmark.id)"
          @toggle-select="$emit('toggleSelect', $event)"
          @open="$emit('open', $event)"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
        />
      </div>
    </section>
  </main>
</template>
