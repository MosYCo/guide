<script setup lang="ts">
import type { BookmarkIconMode, BookmarkSettings, StorageUsage } from '../types'

defineProps<{
  open: boolean
  settings: BookmarkSettings
  storageUsage: StorageUsage
  backupCount: number
}>()

defineEmits<{
  close: []
  updateIconMode: [mode: BookmarkIconMode]
  clearBackups: []
}>()

const iconModes: Array<{ value: BookmarkIconMode; label: string; meta: string }> = [
  { value: 'text', label: '文本', meta: '不请求外部图标' },
  { value: 'direct', label: '站点', meta: '请求目标站 favicon' },
  { value: 'google', label: 'Google', meta: '使用 Google favicon 服务' },
]

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}
</script>

<template>
  <div v-if="open" class="overlay open" @click.self="$emit('close')">
    <div
      class="modal manager-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-panel-title"
    >
      <h3 id="settings-panel-title">设置</h3>

      <div class="settings-block">
        <div class="settings-title">图标来源</div>
        <div class="segmented">
          <button
            v-for="mode in iconModes"
            :key="mode.value"
            :class="['segmented-btn', { active: settings.iconMode === mode.value }]"
            type="button"
            @click="$emit('updateIconMode', mode.value)"
          >
            <span>{{ mode.label }}</span>
            <small>{{ mode.meta }}</small>
          </button>
        </div>
      </div>

      <div class="settings-block">
        <div class="settings-title">本地存储</div>
        <div
          class="storage-meter"
          :title="`${formatBytes(storageUsage.usedBytes)} / ${formatBytes(storageUsage.quotaBytes)}`"
        >
          <span :style="{ width: `${storageUsage.percent}%` }"></span>
        </div>
        <div class="settings-meta">
          {{ formatBytes(storageUsage.usedBytes) }} / {{ formatBytes(storageUsage.quotaBytes) }}
        </div>
      </div>

      <div class="manager-row">
        <div class="manager-main">
          <span class="manager-name">自动备份</span>
          <span class="manager-meta">{{ backupCount }} 个快照</span>
        </div>
        <button
          class="mini-btn danger"
          :disabled="backupCount === 0"
          @click="$emit('clearBackups')"
        >
          清空备份
        </button>
      </div>

      <div class="modal-ft">
        <button class="btn btn-acc" @click="$emit('close')">完成</button>
      </div>
    </div>
  </div>
</template>
