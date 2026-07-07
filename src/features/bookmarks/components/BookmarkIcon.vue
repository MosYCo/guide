<script setup lang="ts">
import { computed } from 'vue'
import type { Bookmark, BookmarkIconMode } from '../types'
import { getDirectFaviconUrl, getFaviconUrl } from '../utils'

const props = defineProps<{
  bookmark: Bookmark
  variant?: 'dock' | 'card'
  iconMode: BookmarkIconMode
}>()

const size = computed(() => (props.variant === 'dock' ? 44 : 30))

const src = computed(() => {
  if (props.iconMode === 'text' || props.bookmark.icon) return ''
  if (props.bookmark.faviconUrl) return props.bookmark.faviconUrl
  if (props.iconMode === 'direct') return getDirectFaviconUrl(props.bookmark.url)
  return getFaviconUrl(props.bookmark.url, props.variant === 'dock' ? 64 : 32)
})

const initial = computed(() => {
  if (props.bookmark.icon) return props.bookmark.icon
  return props.bookmark.title.charAt(0)
})
</script>

<template>
  <el-avatar
    :size="size"
    :src="src || undefined"
    shape="square"
    :style="{
      background: 'var(--accent-d)',
      color: 'var(--accent)',
      fontWeight: 700,
      fontSize: variant === 'dock' ? '18px' : '12px',
      fontFamily: 'var(--fm)',
      borderRadius: variant === 'dock' ? '10px' : '6px',
    }"
  >
    {{ initial }}
  </el-avatar>
</template>
