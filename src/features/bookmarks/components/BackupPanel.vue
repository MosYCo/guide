<script setup lang="ts">
import type { BookmarkBackup } from '../types'

defineProps<{
  open: boolean
  backups: BookmarkBackup[]
}>()

defineEmits<{
  close: []
  restore: [id: string]
}>()

const formatTime = (value: string) => {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div v-if="open" class="overlay open" @click.self="$emit('close')">
    <div
      class="modal manager-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-panel-title"
    >
      <h3 id="backup-panel-title">备份恢复</h3>
      <div v-if="!backups.length" class="manager-empty">
        还没有备份。执行删除、批量操作或分类调整后会自动生成。
      </div>
      <div v-else class="manager-list">
        <div v-for="backup in backups" :key="backup.id" class="manager-row">
          <div class="manager-main">
            <span class="manager-name">{{ backup.label }}</span>
            <span class="manager-meta"
              >{{ formatTime(backup.createdAt) }} · {{ backup.bookmarks.length }} 个书签</span
            >
          </div>
          <button class="mini-btn" @click="$emit('restore', backup.id)">恢复</button>
        </div>
      </div>
      <div class="modal-ft">
        <button class="btn btn-acc" @click="$emit('close')">完成</button>
      </div>
    </div>
  </div>
</template>
