<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Bookmark, BookmarkIconMode } from '../types'
import { getDirectFaviconUrl, getFaviconUrl } from '../utils'

const props = defineProps<{
  bookmark: Bookmark
  variant?: 'dock' | 'card'
  iconMode: BookmarkIconMode
}>()

const imageReady = ref(false)
let imageTimer: ReturnType<typeof setTimeout> | null = null

const usesRemoteIcon = computed(() => !props.bookmark.icon && props.iconMode !== 'text')

const getIconUrl = () => {
  if (props.iconMode === 'text') return ''
  if (props.bookmark.faviconUrl) return props.bookmark.faviconUrl
  if (props.iconMode === 'direct') return getDirectFaviconUrl(props.bookmark.url)

  return getFaviconUrl(props.bookmark.url, props.variant === 'dock' ? 64 : 32)
}

const scheduleImageLoad = () => {
  imageReady.value = false
  if (imageTimer) window.clearTimeout(imageTimer)
  if (!usesRemoteIcon.value) return

  imageTimer = window.setTimeout(() => {
    imageReady.value = true
  }, 300)
}

onMounted(scheduleImageLoad)

onBeforeUnmount(() => {
  if (imageTimer) window.clearTimeout(imageTimer)
})

watch(
  () => [props.bookmark.icon, props.bookmark.url, props.bookmark.faviconUrl, props.iconMode],
  scheduleImageLoad,
)
</script>

<template>
  <span :class="variant === 'dock' ? 'dc-favicon' : 'bf'">
    <template v-if="bookmark.icon">{{ bookmark.icon }}</template>
    <template v-else-if="iconMode === 'text'">{{ bookmark.title.charAt(0) }}</template>
    <template v-else-if="!imageReady">{{ bookmark.title.charAt(0) }}</template>
    <img
      v-else
      :src="getIconUrl()"
      alt=""
      loading="lazy"
      @error="($event.target as HTMLImageElement).replaceWith(bookmark.title.charAt(0))"
    />
  </span>
</template>
