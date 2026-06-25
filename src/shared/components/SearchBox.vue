<script setup lang="ts">
const model = defineModel<string>({ required: true })

defineProps<{
  resultCount: number
}>()
</script>

<template>
  <div :class="['search-wrap', { 'has-query': model.trim() }]">
    <svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      id="bookmark-search"
      v-model="model"
      type="text"
      placeholder="搜索书签..."
      autocomplete="off"
      spellcheck="false"
    />
    <span class="rc">{{ resultCount }} 结果</span>
    <span class="sb"><kbd>/</kbd><kbd>↑↓</kbd><kbd>↵</kbd></span>
  </div>
</template>
