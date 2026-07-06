<script setup lang="ts">
import { computed, ref } from 'vue'
import { CATEGORY_COLORS } from '../constants'
import type { Bookmark, BookmarkIconMode, DockDropPlacement, DockMoveDirection } from '../types'
import { getHostname, getPinnedBookmarks } from '../utils'
import BookmarkIcon from './BookmarkIcon.vue'

const props = defineProps<{
  bookmarks: Bookmark[]
  iconMode: BookmarkIconMode
}>()

const emit = defineEmits<{
  open: [bookmark: Bookmark]
  edit: [bookmark: Bookmark]
  unpin: [bookmark: Bookmark]
  reorder: [draggedId: string, targetId: string, placement: DockDropPlacement]
  move: [bookmark: Bookmark, direction: DockMoveDirection]
}>()

const pinnedBookmarks = computed(() => getPinnedBookmarks(props.bookmarks))
const keys = '123456789'
const draggedId = ref<string | null>(null)
const dragTargetId = ref<string | null>(null)
const dropPlacement = ref<DockDropPlacement>('after')
const pointerDraggedId = ref<string | null>(null)

const handleDragStart = (event: DragEvent, bookmark: Bookmark) => {
  draggedId.value = bookmark.id
  event.dataTransfer?.setData('text/plain', bookmark.id)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

const handleDragOver = (event: DragEvent, bookmark: Bookmark) => {
  if (!draggedId.value || draggedId.value === bookmark.id) return

  event.preventDefault()

  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  dragTargetId.value = bookmark.id
  dropPlacement.value = event.clientX < rect.left + rect.width / 2 ? 'before' : 'after'

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDrop = (event: DragEvent, bookmark: Bookmark) => {
  event.preventDefault()

  if (draggedId.value && draggedId.value !== bookmark.id) {
    emit('reorder', draggedId.value, bookmark.id, dropPlacement.value)
  }

  clearDragState()
}

const clearDragState = () => {
  draggedId.value = null
  pointerDraggedId.value = null
  dragTargetId.value = null
  dropPlacement.value = 'after'
}

const handlePointerDown = (event: PointerEvent, bookmark: Bookmark) => {
  if (event.pointerType === 'mouse') return
  pointerDraggedId.value = bookmark.id
  draggedId.value = bookmark.id
}

const handlePointerMove = (event: PointerEvent) => {
  if (!pointerDraggedId.value) return

  const card = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest<HTMLElement>('.dock-card')
  const targetId = card?.dataset.bookmarkId
  if (!card || !targetId || targetId === pointerDraggedId.value) return

  const target = card
  const rect = target.getBoundingClientRect()
  dragTargetId.value = targetId
  dropPlacement.value = event.clientX < rect.left + rect.width / 2 ? 'before' : 'after'
}

const handlePointerUp = () => {
  if (
    pointerDraggedId.value &&
    dragTargetId.value &&
    pointerDraggedId.value !== dragTargetId.value
  ) {
    emit('reorder', pointerDraggedId.value, dragTargetId.value, dropPlacement.value)
  }

  clearDragState()
}
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
        :class="[
          'dock-card',
          {
            dragging: draggedId === bookmark.id,
            'drop-before': dragTargetId === bookmark.id && dropPlacement === 'before',
            'drop-after': dragTargetId === bookmark.id && dropPlacement === 'after',
          },
        ]"
        :href="bookmark.url"
        :data-bookmark-id="bookmark.id"
        target="_blank"
        rel="noopener"
        draggable="true"
        :style="{ animationDelay: `${0.12 + index * 0.06}s` }"
        @dragstart="handleDragStart($event, bookmark)"
        @dragover="handleDragOver($event, bookmark)"
        @dragleave="dragTargetId === bookmark.id && (dragTargetId = null)"
        @drop="handleDrop($event, bookmark)"
        @dragend="clearDragState"
        @pointerdown="handlePointerDown($event, bookmark)"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="clearDragState"
        @click="$emit('open', bookmark)"
      >
        <div class="dc-shimmer"></div>
        <span
          class="dc-cat-dot"
          :style="{ background: CATEGORY_COLORS[bookmark.cat] || 'var(--muted2)' }"
        ></span>
        <span v-if="index < keys.length" class="dc-key">{{ keys[index] }}</span>
        <BookmarkIcon :bookmark="bookmark" :icon-mode="iconMode" variant="dock" />
        <div class="dc-name" :title="bookmark.title">{{ bookmark.title }}</div>
        <div class="dc-domain">{{ getHostname(bookmark.url) }}</div>
        <div v-if="bookmark.visits" class="dc-visits">{{ bookmark.visits }} 次</div>
        <div class="dc-act">
          <button
            :disabled="index === 0"
            :aria-label="`向左移动 ${bookmark.title}`"
            title="向左移动"
            @click.prevent.stop="$emit('move', bookmark, 'left')"
          >
            ‹
          </button>
          <button
            :disabled="index === pinnedBookmarks.length - 1"
            :aria-label="`向右移动 ${bookmark.title}`"
            title="向右移动"
            @click.prevent.stop="$emit('move', bookmark, 'right')"
          >
            ›
          </button>
          <button
            :aria-label="`编辑 ${bookmark.title}`"
            title="编辑"
            @click.prevent.stop="$emit('edit', bookmark)"
          >
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
