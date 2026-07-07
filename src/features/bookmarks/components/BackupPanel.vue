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
  <el-dialog
    :model-value="open"
    title="备份恢复"
    width="760px"
    :close-on-click-modal="true"
    @close="$emit('close')"
  >
    <el-empty v-if="!backups.length" description="还没有备份。执行删除、批量操作或分类调整后会自动生成。" />
    <el-table v-else :data="backups" stripe>
      <el-table-column prop="label" label="备份名称" min-width="160" />
      <el-table-column label="时间" min-width="140">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="书签数" width="100" align="center">
        <template #default="{ row }">{{ row.bookmarks.length }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" align="center">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="$emit('restore', row.id)">恢复</el-button>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button type="primary" @click="$emit('close')">完成</el-button>
    </template>
  </el-dialog>
</template>
