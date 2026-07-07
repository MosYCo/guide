<script setup lang="ts">
import { computed, ref } from 'vue'
import { UNCATEGORIZED_CATEGORY } from '../constants'
import type { CategorySummary, DockMoveDirection } from '../types'

const props = defineProps<{
  open: boolean
  categories: CategorySummary[]
}>()

const emit = defineEmits<{
  close: []
  rename: [from: string, to: string]
  merge: [from: string, to: string]
  move: [category: string, direction: DockMoveDirection]
  hide: [category: string, hidden: boolean]
  delete: [category: string]
}>()

const renameDraft = ref<Record<string, string>>({})
const mergeTarget = ref<Record<string, string>>({})

const categoryNames = computed(() => props.categories.map((category) => category.name))

const commitRename = (category: string) => {
  const nextName = renameDraft.value[category]?.trim()
  if (!nextName || nextName === category) return
  emit('rename', category, nextName)
  renameDraft.value[category] = ''
}
</script>

<template>
  <el-dialog
    :model-value="open"
    title="分类管理"
    width="760px"
    :close-on-click-modal="true"
    @close="$emit('close')"
  >
    <el-table :data="categories" stripe>
      <el-table-column prop="name" label="分类" min-width="100" />
      <el-table-column label="书签数" width="80" align="center">
        <template #default="{ row }">{{ row.count }}</template>
      </el-table-column>
      <el-table-column label="排序" width="90" align="center">
        <template #default="{ row, $index }">
          <el-button size="small" :disabled="$index === 0" @click="$emit('move', row.name, 'left')">↑</el-button>
          <el-button size="small" :disabled="$index === categories.length - 1" @click="$emit('move', row.name, 'right')">↓</el-button>
        </template>
      </el-table-column>
      <el-table-column label="重命名" min-width="180">
        <template #default="{ row }">
          <el-input
            v-model="renameDraft[row.name]"
            size="small"
            placeholder="新名称"
            style="width: 100px; margin-right: 4px"
            :disabled="row.name === UNCATEGORIZED_CATEGORY"
            @keyup.enter="commitRename(row.name)"
          />
          <el-button size="small" :disabled="row.name === UNCATEGORIZED_CATEGORY" @click="commitRename(row.name)">改名</el-button>
        </template>
      </el-table-column>
      <el-table-column label="合并" min-width="180">
        <template #default="{ row }">
          <el-select
            v-model="mergeTarget[row.name]"
            size="small"
            placeholder="合并到..."
            style="width: 100px; margin-right: 4px"
            :disabled="row.name === UNCATEGORIZED_CATEGORY"
          >
            <el-option
              v-for="name in categoryNames.filter((n) => n !== row.name)"
              :key="name"
              :label="name"
              :value="name"
            />
          </el-select>
          <el-button
            size="small"
            :disabled="!mergeTarget[row.name] || row.name === UNCATEGORIZED_CATEGORY"
            @click="$emit('merge', row.name, mergeTarget[row.name])"
          >合并</el-button>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" align="center">
        <template #default="{ row }">
          <el-button
            size="small"
            :disabled="row.name === UNCATEGORIZED_CATEGORY"
            @click="$emit('hide', row.name, !row.hidden)"
          >{{ row.hidden ? '恢复' : '隐藏' }}</el-button>
          <el-button
            size="small"
            type="danger"
            :disabled="row.name === UNCATEGORIZED_CATEGORY"
            @click="$emit('delete', row.name)"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button type="primary" @click="$emit('close')">完成</el-button>
    </template>
  </el-dialog>
</template>
