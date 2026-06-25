<script setup lang="ts">
defineProps<{
  message: string
  visible: boolean
}>()
</script>

<template>
  <div :class="['toast', { show: visible }]">{{ message }}</div>
</template>
