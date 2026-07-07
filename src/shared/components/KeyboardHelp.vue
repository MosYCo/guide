<script setup lang="ts">
defineProps<{
  open: boolean
}>()

defineEmits<{
  close: []
}>()

const shortcuts = [
  { action: '命令面板', keys: ['Ctrl', 'K'] },
  { action: '聚焦搜索', keys: ['/'] },
  { action: '导航书签', keys: ['↑', '↓', '←', '→'] },
  { action: '打开选中', keys: ['Enter'] },
  { action: '编辑 / 删除 / 固定', keys: ['E', 'D', 'P'] },
  { action: '调整 Dock 顺序', keys: ['Shift', '←', '→'] },
  { action: '清除搜索 / 关闭', keys: ['Esc'] },
  { action: '添加书签', keys: ['Ctrl', 'N'] },
  { action: '切换分类', keys: ['1', '-', '9'] },
  { action: '切换主题', keys: ['T'] },
  { action: '键盘帮助', keys: ['?'] },
]
</script>

<template>
  <el-dialog
    :model-value="open"
    title="键盘快捷键"
    width="480px"
    @close="$emit('close')"
  >
    <el-descriptions :column="1" border>
      <el-descriptions-item v-for="s in shortcuts" :key="s.action" :label="s.action">
        <el-tag v-for="k in s.keys" :key="k" size="small" style="margin-right: 4px">{{ k }}</el-tag>
      </el-descriptions-item>
    </el-descriptions>
    <div style="text-align: center; margin-top: 16px; color: var(--el-text-color-secondary); font-size: 12px">
      按 Esc 关闭
    </div>
  </el-dialog>
</template>
