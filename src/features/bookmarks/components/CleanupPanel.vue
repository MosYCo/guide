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
  <el-dialog
    :model-value="open"
    title="整理工具"
    width="760px"
    :close-on-click-modal="true"
    @close="$emit('close')"
  >
    <el-descriptions :column="2" border>
      <el-descriptions-item label="重复链接">
        {{ summary.duplicateGroups.length }} 组
        <el-button
          size="small"
          :disabled="summary.duplicateGroups.length === 0"
          style="margin-left: 12px"
          @click="$emit('deduplicate')"
        >合并</el-button>
      </el-descriptions-item>
      <el-descriptions-item label="长期未访问">
        {{ summary.staleBookmarks.length }} 个非 Dock 书签
        <el-button
          size="small"
          type="danger"
          :disabled="summary.staleBookmarks.length === 0"
          style="margin-left: 12px"
          @click="$emit('removeStale')"
        >删除</el-button>
      </el-descriptions-item>
      <el-descriptions-item label="空分类">
        {{ summary.emptyCategories.length }} 个
        <el-button
          size="small"
          :disabled="summary.emptyCategories.length === 0"
          style="margin-left: 12px"
          @click="$emit('cleanupEmptyCategories')"
        >清理</el-button>
      </el-descriptions-item>
      <el-descriptions-item label="低频标签">
        {{ summary.lowFrequencyTags.length }} 个只出现一次的标签
        <el-button
          size="small"
          :disabled="summary.lowFrequencyTags.length === 0"
          style="margin-left: 12px"
          @click="$emit('removeLowFrequencyTags')"
        >移除</el-button>
      </el-descriptions-item>
    </el-descriptions>

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

    <template #footer>
      <el-button type="primary" @click="$emit('close')">完成</el-button>
    </template>
  </el-dialog>
</template>
