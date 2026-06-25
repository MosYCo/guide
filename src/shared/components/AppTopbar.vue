<script setup lang="ts">
import type { ThemeDefinition } from '@/shared/composables/useTheme'
import ThemeButton from './ThemeButton.vue'
import SearchBox from './SearchBox.vue'

const query = defineModel<string>('query', { required: true })

defineProps<{
  theme: ThemeDefinition
  resultCount: number
  time: string
}>()

defineEmits<{
  add: []
  export: []
  toggleHelp: []
  cycleTheme: []
}>()
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <span class="brand-dot"></span>
      NAV<span>HUB</span>
    </div>

    <ThemeButton :theme="theme" @cycle="$emit('cycleTheme')" />
    <SearchBox v-model="query" :result-count="resultCount" />

    <div class="t-right">
      <span class="clock">{{ time }}</span>
      <span class="dot-sep"></span>
      <button class="btn btn-icon" title="键盘快捷键" @click="$emit('toggleHelp')">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
        </svg>
      </button>
      <button class="btn" title="导出 JSON" @click="$emit('export')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span class="lbl">导出</span>
      </button>
      <button class="btn btn-acc" @click="$emit('add')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span class="lbl">添加</span>
      </button>
    </div>
  </header>
</template>
