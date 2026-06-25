<script setup lang="ts">
import type { Bookmark } from '../types'
import { getFaviconUrl } from '../utils'

defineProps<{
  bookmark: Bookmark
  variant?: 'dock' | 'card'
}>()
</script>

<template>
  <span :class="variant === 'dock' ? 'dc-favicon' : 'bf'">
    <template v-if="bookmark.icon">{{ bookmark.icon }}</template>
    <img
      v-else
      :src="getFaviconUrl(bookmark.url, variant === 'dock' ? 64 : 32)"
      alt=""
      loading="lazy"
      @error="($event.target as HTMLImageElement).replaceWith(bookmark.title.charAt(0))"
    />
  </span>
</template>
