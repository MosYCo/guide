<script setup lang="ts">
import Header from '@/components/Header.vue'
import BookmarkManager from '@/components/bookmark/manager.vue'
import TodoManager from '@/components/todo/manager.vue'
import { useTheme } from '@/composables/useTheme'
const { isDarkTheme, toggleTheme } = useTheme()
</script>

<template>
  <div :class="['app-container', { 'dark-theme': isDarkTheme }]">
    <Header @toggle-theme="toggleTheme" />

    <main class="content-container">
      <div class="module">
        <BookmarkManager />
      </div>

      <div class="module">
        <TodoManager />
      </div>
    </main>
  </div>
</template>

<style lang="scss">
.app-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition:
    background-color 0.3s,
    color 0.3s;
}

.content-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
}

.module {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  transition: background-color 0.3s;

  .dark-theme & {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
}
</style>
