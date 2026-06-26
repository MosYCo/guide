<script setup lang="ts">
import type { Bookmark } from '../types'
import { getHostname } from '../utils'
import BookmarkIcon from './BookmarkIcon.vue'

defineProps<{
  bookmark: Bookmark
  focused: boolean
  query: string
}>()

defineEmits<{
  edit: [bookmark: Bookmark]
  delete: [bookmark: Bookmark]
}>()

const parts = (text: string, query: string) => {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return [{ text, match: false }]

  const index = text.toLowerCase().indexOf(normalizedQuery)
  if (index === -1) return [{ text, match: false }]

  return [
    { text: text.slice(0, index), match: false },
    { text: text.slice(index, index + normalizedQuery.length), match: true },
    { text: text.slice(index + normalizedQuery.length), match: false },
  ].filter((part) => part.text)
}
</script>

<template>
  <a
    :class="['bk', { 'kb-focus': focused }]"
    :href="bookmark.url"
    target="_blank"
    rel="noopener"
    :data-bookmark-id="bookmark.id"
  >
    <div class="bk-shine"></div>
    <BookmarkIcon :bookmark="bookmark" />
    <div class="bk-body">
      <div class="bk-name">
        <template v-for="part in parts(bookmark.title, query)" :key="`${part.text}-${part.match}`">
          <mark v-if="part.match">{{ part.text }}</mark>
          <template v-else>{{ part.text }}</template>
        </template>
      </div>
      <div class="bk-host">
        <template v-for="part in parts(getHostname(bookmark.url), query)" :key="`${part.text}-${part.match}`">
          <mark v-if="part.match">{{ part.text }}</mark>
          <template v-else>{{ part.text }}</template>
        </template>
      </div>
    </div>
    <svg class="bk-arw" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
    <div class="bk-act">
      <button :aria-label="`编辑 ${bookmark.title}`" title="编辑" @click.prevent.stop="$emit('edit', bookmark)">
        ✎
      </button>
      <button
        class="del"
        :aria-label="`删除 ${bookmark.title}`"
        title="删除"
        @click.prevent.stop="$emit('delete', bookmark)"
      >
        ✕
      </button>
    </div>
  </a>
</template>
