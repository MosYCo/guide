<script setup lang="ts">
import { computed } from 'vue'
import IconDelete from '../icons/IconDelete.vue'
import IconEdit from '../icons/IconEdit.vue'

const props = defineProps<{
  bookmark: Entity.Bookmark
}>()

const emit = defineEmits(['edit', 'delete'])

const faviconUrl = computed(() => {
  if (props.bookmark.icon) return props.bookmark.icon
  try {
    const url = new URL(props.bookmark.url)
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`
  } catch {
    return '/default-favicon.png'
  }
})

const openBookmark = () => {
  window.open(props.bookmark.url, '_blank')
}
</script>

<template>
  <div class="bookmark-card">
    <div class="card-content" @click="openBookmark">
      <div class="icon-container">
        <img :src="faviconUrl" :alt="bookmark.title + ' icon'" class="favicon" />
      </div>
      <div class="text-content">
        <h3 class="title">{{ bookmark.title }}</h3>
        <p class="url">{{ bookmark.url }}</p>
      </div>
    </div>
    <div class="card-actions">
      <button class="action-button" @click.stop="emit('edit')">
        <icon-edit />
      </button>
      <button class="action-button delete" @click.stop="emit('delete')">
        <icon-delete />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.bookmark-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);

    .dark-theme & {
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
    }
  }
}

.card-content {
  padding: 1.2rem;
  flex-grow: 1;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.icon-container {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  .favicon {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }
}

.text-content {
  overflow: hidden;

  .title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .url {
    margin: 0.3rem 0 0;
    font-size: 0.8rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.card-actions {
  display: flex;
  border-top: 1px solid var(--border-color);

  .action-button {
    flex: 1;
    background: none;
    border: none;
    padding: 0.7rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition: background-color 0.2s;

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);

      .dark-theme & {
        background-color: rgba(255, 255, 255, 0.05);
      }
    }

    &.delete:hover {
      color: var(--error-color);
    }
  }
}
</style>
