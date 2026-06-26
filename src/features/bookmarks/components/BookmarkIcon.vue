<script setup lang="ts">
import type { Bookmark } from '../types'
import { getFaviconUrl } from '../utils'

const props = defineProps<{
  bookmark: Bookmark
  variant?: 'dock' | 'card'
}>()

const getIconUrl = () => {
  return props.bookmark.faviconUrl || getFaviconUrl(props.bookmark.url, props.variant === 'dock' ? 64 : 32)
}
</script>

<template>
  <span :class="variant === 'dock' ? 'dc-favicon' : 'bf'">
    <template v-if="bookmark.icon">{{ bookmark.icon }}</template>
    <img
      v-else
      :src="getIconUrl()"
      alt=""
      loading="lazy"
      @error="($event.target as HTMLImageElement).replaceWith(bookmark.title.charAt(0))"
    />
  </span>
</template>
