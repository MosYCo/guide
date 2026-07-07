<script setup lang="ts">
import type { Bookmark, BookmarkGroup, BookmarkIconMode } from '../types'
import BookmarkCard from './BookmarkCard.vue'

defineProps<{
  groups: BookmarkGroup[]
  collapsedCategories: Record<string, boolean>
  focusedId: string | null
  query: string
  selectedIds: string[]
  activeCategory: string | null
  iconMode: BookmarkIconMode
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
    <el-empty v-if="!groups.length">
      <template #description>
        {{
          query
            ? `没有匹配「${query}」`
            : activeCategory
              ? `「${activeCategory}」下没有书签`
              : '还没有书签'
        }}
      </template>
      <el-button v-if="!query" type="primary" @click="$emit('add')">添加书签</el-button>
    </el-empty>

    <el-collapse
      v-else
      :model-value="groups.filter((g) => !collapsedCategories[g.name]).map((g) => g.name)"
      @update:model-value="(val: string | string[]) => {
        const open = Array.isArray(val) ? val : [val]
        groups.forEach((g) => {
          const isOpen = open.includes(g.name)
          if (isOpen === !!collapsedCategories[g.name]) $emit('toggle', g.name)
        })
      }"
    >
      <el-collapse-item
        v-for="(group, groupIndex) in groups"
        :key="group.name"
        :name="group.name"
        :style="{ animationDelay: `${0.1 + groupIndex * 0.02}s` }"
      >
        <template #title>
          <span class="cat-label">{{ group.name }}</span>
          <span class="cat-rule"></span>
          <span class="cat-n">{{ group.items.length }}</span>
        </template>
        <div class="cat-grid">
          <BookmarkCard
            v-for="bookmark in group.items"
            :key="bookmark.id"
            :bookmark="bookmark"
            :focused="focusedId === bookmark.id"
            :query="query"
            :selected="selectedIds.includes(bookmark.id)"
            :icon-mode="iconMode"
            @toggle-select="$emit('toggleSelect', $event)"
            @open="$emit('open', $event)"
            @edit="$emit('edit', $event)"
            @delete="$emit('delete', $event)"
          />
        </div>
      </el-collapse-item>
    </el-collapse>
  </main>
</template>
