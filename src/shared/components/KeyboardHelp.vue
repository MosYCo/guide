<script setup lang="ts">
defineProps<{
  open: boolean
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <div v-if="open" class="kb-help open" @click.self="$emit('close')">
    <div class="kb-panel">
      <h3>键盘快捷键</h3>
      <div class="kb-row"><span>聚焦搜索</span><div class="kb-keys"><kbd>/</kbd></div></div>
      <div class="kb-row"><span>导航书签</span><div class="kb-keys"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd></div></div>
      <div class="kb-row"><span>打开选中</span><div class="kb-keys"><kbd>Enter</kbd></div></div>
      <div class="kb-row"><span>清除搜索 / 关闭</span><div class="kb-keys"><kbd>Esc</kbd></div></div>
      <div class="kb-row"><span>添加书签</span><div class="kb-keys"><kbd>Ctrl</kbd><kbd>N</kbd></div></div>
      <div class="kb-row"><span>切换分类</span><div class="kb-keys"><kbd>1</kbd>-<kbd>9</kbd></div></div>
      <div class="kb-row"><span>切换主题</span><div class="kb-keys"><kbd>T</kbd></div></div>
      <div class="kb-row"><span>键盘帮助</span><div class="kb-keys"><kbd>?</kbd></div></div>
      <div class="kb-footer">按 Esc 关闭</div>
    </div>
  </div>
</template>
