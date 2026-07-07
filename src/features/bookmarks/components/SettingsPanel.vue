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
  <el-dialog
    :model-value="open"
    title="设置"
    width="760px"
    :close-on-click-modal="true"
    @close="$emit('close')"
  >
    <div class="settings-block">
      <div class="settings-title">图标来源</div>
      <el-segmented
        :model-value="settings.iconMode"
        :options="iconModes.map((m) => ({ ...m, value: m.value }))"
        @change="(val: any) => $emit('updateIconMode', val as BookmarkIconMode)"
      >
        <template #default="{ item }">
          <div style="padding: 4px 8px; text-align: center">
            <div style="font-weight: 700; font-size: 14px">{{ (item as any).label }}</div>
            <div style="font-size: 12px; color: var(--el-text-color-secondary)">
              {{ (item as any).meta }}
            </div>
          </div>
        </template>
      </el-segmented>
    </div>

    <div class="settings-block">
      <div class="settings-title">本地存储</div>
      <el-progress
        :percentage="storageUsage.percent"
        :stroke-width="10"
        :format="() => `${formatBytes(storageUsage.usedBytes)} / ${formatBytes(storageUsage.quotaBytes)}`"
      />
    </div>

    <el-descriptions :column="1" border>
      <el-descriptions-item label="自动备份">
        {{ backupCount }} 个快照
        <el-button
          size="small"
          type="danger"
          :disabled="backupCount === 0"
          style="margin-left: 12px"
          @click="$emit('clearBackups')"
        >清空备份</el-button>
      </el-descriptions-item>
    </el-descriptions>

    <template #footer>
      <el-button type="primary" @click="$emit('close')">完成</el-button>
    </template>
  </el-dialog>
</template>
