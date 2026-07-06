<script setup lang="ts">
import type { BookmarkCleanupSummary } from '../types'

defineProps<{
  open: boolean
  summary: BookmarkCleanupSummary
}>()

defineEmits<{
  close: []
  deduplicate: []
  removeStale: []
  cleanupEmptyCategories: []
  removeLowFrequencyTags: []
}>()
</script>

<template>
  <div v-if="open" class="overlay open" @click.self="$emit('close')">
    <div
      class="modal manager-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cleanup-panel-title"
    >
      <h3 id="cleanup-panel-title">整理工具</h3>

      <div class="manager-list">
        <div class="manager-row">
          <div class="manager-main">
            <span class="manager-name">重复链接</span>
            <span class="manager-meta">{{ summary.duplicateGroups.length }} 组</span>
          </div>
          <button
            class="mini-btn"
            :disabled="summary.duplicateGroups.length === 0"
            @click="$emit('deduplicate')"
          >
            合并
          </button>
        </div>

        <div class="manager-row">
          <div class="manager-main">
            <span class="manager-name">长期未访问</span>
            <span class="manager-meta">{{ summary.staleBookmarks.length }} 个非 Dock 书签</span>
          </div>
          <button
            class="mini-btn danger"
            :disabled="summary.staleBookmarks.length === 0"
            @click="$emit('removeStale')"
          >
            删除
          </button>
        </div>

        <div class="manager-row">
          <div class="manager-main">
            <span class="manager-name">空分类</span>
            <span class="manager-meta">{{ summary.emptyCategories.length }} 个</span>
          </div>
          <button
            class="mini-btn"
            :disabled="summary.emptyCategories.length === 0"
            @click="$emit('cleanupEmptyCategories')"
          >
            清理
          </button>
        </div>

        <div class="manager-row">
          <div class="manager-main">
            <span class="manager-name">低频标签</span>
            <span class="manager-meta"
              >{{ summary.lowFrequencyTags.length }} 个只出现一次的标签</span
            >
          </div>
          <button
            class="mini-btn"
            :disabled="summary.lowFrequencyTags.length === 0"
            @click="$emit('removeLowFrequencyTags')"
          >
            移除
          </button>
        </div>
      </div>

      <div class="cleanup-preview">
        <div v-if="summary.duplicateGroups.length">
          <span>重复</span>
          {{
            summary.duplicateGroups
              .slice(0, 3)
              .map((group) => group.items[0]?.title)
              .join(' / ')
          }}
        </div>
        <div v-if="summary.staleBookmarks.length">
          <span>未访问</span>
          {{
            summary.staleBookmarks
              .slice(0, 5)
              .map((bookmark) => bookmark.title)
              .join(' / ')
          }}
        </div>
        <div v-if="summary.emptyCategories.length">
          <span>空分类</span>
          {{ summary.emptyCategories.join(' / ') }}
        </div>
      </div>

      <div class="modal-ft">
        <button class="btn btn-acc" @click="$emit('close')">完成</button>
      </div>
    </div>
  </div>
</template>
