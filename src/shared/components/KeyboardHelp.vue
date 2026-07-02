<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
}>()

defineEmits<{
  close: []
}>()

const panel = ref<HTMLElement>()
let previousFocus: HTMLElement | null = null

watch(
  () => props.open,
  (open) => {
    if (open) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      nextTick(() => panel.value?.focus())
    } else {
      previousFocus?.focus()
      previousFocus = null
    }
  },
)
</script>

<template>
  <div v-if="open" class="kb-help open" @click.self="$emit('close')">
    <div
      ref="panel"
      class="kb-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-help-title"
      tabindex="-1"
    >
      <h3 id="keyboard-help-title">键盘快捷键</h3>
      <div class="kb-row">
        <span>命令面板</span>
        <div class="kb-keys"><kbd>Ctrl</kbd><kbd>K</kbd></div>
      </div>
      <div class="kb-row">
        <span>聚焦搜索</span>
        <div class="kb-keys"><kbd>/</kbd></div>
      </div>
      <div class="kb-row">
        <span>导航书签</span>
        <div class="kb-keys"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd></div>
      </div>
      <div class="kb-row">
        <span>打开选中</span>
        <div class="kb-keys"><kbd>Enter</kbd></div>
      </div>
      <div class="kb-row">
        <span>编辑 / 删除 / 固定</span>
        <div class="kb-keys"><kbd>E</kbd><kbd>D</kbd><kbd>P</kbd></div>
      </div>
      <div class="kb-row">
        <span>调整 Dock 顺序</span>
        <div class="kb-keys"><kbd>Shift</kbd><kbd>←</kbd><kbd>→</kbd></div>
      </div>
      <div class="kb-row">
        <span>清除搜索 / 关闭</span>
        <div class="kb-keys"><kbd>Esc</kbd></div>
      </div>
      <div class="kb-row">
        <span>添加书签</span>
        <div class="kb-keys"><kbd>Ctrl</kbd><kbd>N</kbd></div>
      </div>
      <div class="kb-row">
        <span>切换分类</span>
        <div class="kb-keys"><kbd>1</kbd>-<kbd>9</kbd></div>
      </div>
      <div class="kb-row">
        <span>切换主题</span>
        <div class="kb-keys"><kbd>T</kbd></div>
      </div>
      <div class="kb-row">
        <span>键盘帮助</span>
        <div class="kb-keys"><kbd>?</kbd></div>
      </div>
      <div class="kb-footer">按 Esc 关闭</div>
    </div>
  </div>
</template>
