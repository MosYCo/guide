<script setup lang="ts">
import { ref, onMounted } from 'vue'
import BookmarkCard from './card.vue'
import { addBookmark, deleteBookmark, getAllBookmarks, updateBookmark } from '@/db/indexedDB'
import IconPlus from '../icons/IconPlus.vue'

const bookmarks = ref<Entity.Bookmark[]>([])
const showForm = ref(false)
const currentBookmark = ref<Entity.Bookmark>({ title: '', url: '' })
const isEditing = ref(false)
const errorMessage = ref('')

const fetchBookmarks = async () => {
  try {
    bookmarks.value = await getAllBookmarks()
  } catch (error) {
    console.error('获取书签失败:', error)
    errorMessage.value = '获取书签失败，请重试'
  }
}

const openAddForm = () => {
  currentBookmark.value = { title: '', url: '' }
  isEditing.value = false
  showForm.value = true
}

const openEditForm = (bookmark: Entity.Bookmark) => {
  currentBookmark.value = { ...bookmark }
  isEditing.value = true
  showForm.value = true
}

const saveBookmark = async () => {
  if (!currentBookmark.value.title || !currentBookmark.value.url) {
    errorMessage.value = '标题和URL不能为空'
    return
  }

  try {
    if (isEditing.value && currentBookmark.value.id) {
      await updateBookmark(currentBookmark.value.id, currentBookmark.value)
    } else {
      await addBookmark(currentBookmark.value)
    }
    showForm.value = false
    await fetchBookmarks()
    errorMessage.value = ''
  } catch (error) {
    console.error('保存书签失败:', error)
    errorMessage.value = '保存书签失败，请重试'
  }
}

const removeBookmark = async (id: number) => {
  if (confirm('确定要删除这个书签吗？')) {
    try {
      await deleteBookmark(id)
      await fetchBookmarks()
    } catch (error) {
      console.error('删除书签失败:', error)
      errorMessage.value = '删除书签失败，请重试'
    }
  }
}

onMounted(() => {
  fetchBookmarks()
})
</script>

<template>
  <div class="bookmark-manager">
    <div class="manager-header">
      <h2>书签管理</h2>
      <div class="bookmark-stats">
        <span>总数: {{ bookmarks.length }}</span>
      </div>
      <button class="add-button" @click="openAddForm">
        <IconPlus />
        添加书签
      </button>
    </div>

    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <div v-if="bookmarks.length === 0" class="empty-state">
      <p>暂无书签，添加一个吧！</p>
    </div>

    <div class="bookmark-grid">
      <BookmarkCard
        v-for="bookmark in bookmarks"
        :key="bookmark.id"
        :bookmark="bookmark"
        @edit="openEditForm(bookmark)"
        @delete="removeBookmark(bookmark.id!)"
      />
    </div>

    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal">
        <h3>{{ isEditing ? '编辑书签' : '添加书签' }}</h3>
        <form @submit.prevent="saveBookmark">
          <div class="form-group">
            <label for="title">标题</label>
            <input
              type="text"
              id="title"
              v-model="currentBookmark.title"
              autocomplete="off"
              required
              placeholder="显示标题"
            />
          </div>

          <div class="form-group">
            <label for="url">URL</label>
            <input
              type="url"
              id="url"
              v-model="currentBookmark.url"
              autocomplete="off"
              required
              placeholder="https://www.example.com"
            />
          </div>

          <div class="form-actions">
            <button type="button" class="cancel-button" @click="showForm = false">取消</button>
            <button type="submit" class="save-button">保存</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use 'sass:color';

$accent-color: var(--accent-color);

.bookmark-manager {
  .manager-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;

    h2 {
      margin: 0;
      font-size: 1.5rem;
      color: var(--text-primary);
    }

    .bookmark-stats {
      flex-grow: 1;
      margin-left: 1rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
  }

  .add-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: var(--accent-color);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0.5rem 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--accent-10-color);
    }
  }

  .error-message {
    background-color: var(--error-color);
    color: white;
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    text-align: center;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 8px;

    .dark-theme & {
      background-color: rgba(255, 255, 255, 0.05);
    }
  }

  .bookmark-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1rem;

    @media (max-width: 768px) {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal {
    background-color: var(--bg-card);
    border-radius: 12px;
    padding: 1.5rem;
    width: 100%;
    max-width: 450px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);

    h3 {
      margin-top: 0;
      margin-bottom: 1.5rem;
      color: var(--text-primary);
    }

    .form-group {
      margin-bottom: 1.2rem;

      label {
        display: block;
        margin-bottom: 0.5rem;
        color: var(--text-secondary);
        font-size: 0.9rem;
      }

      input {
        width: calc(100% - 1.5rem);
        padding: 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background-color: var(--bg-primary);
        color: var(--text-primary);
        font-size: 1rem;

        &:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(76, 201, 240, 0.2);
        }
      }
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;

      button {
        padding: 0.6rem 1.2rem;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .cancel-button {
        background-color: transparent;
        color: var(--text-secondary);
        border: 1px solid var(--border-color);

        &:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
      }

      .save-button {
        background-color: var(--accent-color);
        color: white;
        border: none;

        &:hover {
          background-color: var(--accent-10-color);
        }
      }
    }
  }
}
</style>
