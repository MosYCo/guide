<script setup lang="ts">
import { computed } from 'vue'
import { CATEGORY_COLORS } from '../constants'
import type { Bookmark } from '../types'
import { getHostname } from '../utils'
import BookmarkIcon from './BookmarkIcon.vue'

const props = defineProps<{
  bookmarks: Bookmark[]
}>()

defineEmits<{
  edit: [bookmark: Bookmark]
  unpin: [bookmark: Bookmark]
}>()

const pinnedBookmarks = computed(() => props.bookmarks.filter((bookmark) => bookmark.pin))
const keys = '123456789'
</script>

<template>
  <section v-if="pinnedBookmarks.length" class="hero-dock-section">
    <div class="hero-dock-header">
      <span class="hero-dock-title">
        <span class="hd-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </span>
        快速启动
      </span>
      <span class="hero-dock-line"></span>
    </div>

    <div class="hero-dock">
      <a
        v-for="(bookmark, index) in pinnedBookmarks"
        :key="bookmark.id"
        class="dock-card"
        :href="bookmark.url"
        target="_blank"
        rel="noopener"
        :style="{ animationDelay: `${0.12 + index * 0.06}s` }"
      >
        <div class="dc-shimmer"></div>
        <span class="dc-cat-dot" :style="{ background: CATEGORY_COLORS[bookmark.cat] || 'var(--muted2)' }"></span>
        <span v-if="index < keys.length" class="dc-key">{{ keys[index] }}</span>
        <BookmarkIcon :bookmark="bookmark" variant="dock" />
        <div class="dc-name" :title="bookmark.title">{{ bookmark.title }}</div>
        <div class="dc-domain">{{ getHostname(bookmark.url) }}</div>
        <div class="dc-act">
          <button :aria-label="`编辑 ${bookmark.title}`" title="编辑" @click.prevent.stop="$emit('edit', bookmark)">
            ✎
          </button>
          <button
            :aria-label="`从快速启动移除 ${bookmark.title}`"
            title="从快速启动移除"
            @click.prevent.stop="$emit('unpin', bookmark)"
          >
            −
          </button>
        </div>
      </a>
    </div>
  </section>
</template>
