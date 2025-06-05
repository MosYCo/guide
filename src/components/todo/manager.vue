<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import TodoItem from './item.vue'
import { addTodo, deleteTodo, getAllTodos, updateTodo } from '@/db/indexedDB'
import IconPlus from '../icons/IconPlus.vue'

const todos = ref<Entity.Todo[]>([])
const showForm = ref(false)
const currentTodo = ref<Entity.Todo>({
  title: '',
  category: '个人',
  completed: 0,
  description: '',
  createdAt: new Date(),
})
const isEditing = ref(false)
const filter = ref<'all' | 'active' | 'completed'>('all')
const errorMessage = ref('')

const filteredTodos = computed(() => {
  if (filter.value === 'active') {
    return todos.value.filter((todo) => !todo.completed)
  }
  if (filter.value === 'completed') {
    return todos.value.filter((todo) => todo.completed)
  }
  return todos.value
})

const completedCount = computed(() => {
  return todos.value.filter((todo) => todo.completed).length
})

const fetchTodos = async () => {
  try {
    todos.value = await getAllTodos()
  } catch (error) {
    console.error('获取待办失败:', error)
    errorMessage.value = '获取待办失败，请重试'
  }
}

const openAddForm = () => {
  currentTodo.value = {
    title: '',
    category: '个人',
    completed: 0,
    description: '',
    createdAt: new Date(),
  }
  isEditing.value = false
  showForm.value = true
}

const openEditForm = (todo: Entity.Todo) => {
  currentTodo.value = { ...todo }
  isEditing.value = true
  showForm.value = true
}

const saveTodo = async () => {
  if (!currentTodo.value.title) {
    errorMessage.value = '标题不能为空'
    return
  }

  try {
    if (isEditing.value && currentTodo.value.id) {
      await updateTodo(currentTodo.value.id, currentTodo.value)
    } else {
      await addTodo(currentTodo.value)
    }
    showForm.value = false
    await fetchTodos()
    errorMessage.value = ''
  } catch (error) {
    console.error('保存待办失败:', error)
    errorMessage.value = '保存待办失败，请重试'
  }
}

const removeTodo = async (id: number) => {
  if (confirm('确定要删除这个待办事项吗？')) {
    try {
      await deleteTodo(id)
      await fetchTodos()
    } catch (error) {
      console.error('删除待办失败:', error)
      errorMessage.value = '删除待办失败，请重试'
    }
  }
}

const toggleComplete = async (id: number) => {
  const todo = todos.value.find((t) => t.id === id)
  if (!todo) return

  const updatedTodo: Entity.Todo = {
    ...todo,
    completed: todo.completed === 0 ? 1 : 0,
    completedAt: todo.completed ? undefined : new Date(),
  }

  try {
    await updateTodo(id, updatedTodo)
    await fetchTodos()
  } catch (error) {
    console.error('更新待办状态失败:', error)
    errorMessage.value = '更新待办状态失败，请重试'
  }
}

onMounted(() => {
  fetchTodos()
})
</script>

<template>
  <div class="todo-manager">
    <div class="manager-header">
      <h2>待办事项</h2>
      <div class="todo-stats">
        <span>总数: {{ todos.length }}</span>
        <span>已完成: {{ completedCount }}</span>
      </div>
      <button class="add-button" @click="openAddForm">
        <icon-plus />
        添加待办
      </button>
    </div>

    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <div class="filter-controls">
      <button :class="['filter-button', { active: filter === 'all' }]" @click="filter = 'all'">
        全部
      </button>
      <button
        :class="['filter-button', { active: filter === 'active' }]"
        @click="filter = 'active'"
      >
        未完成
      </button>
      <button
        :class="['filter-button', { active: filter === 'completed' }]"
        @click="filter = 'completed'"
      >
        已完成
      </button>
    </div>

    <div v-if="filteredTodos.length === 0" class="empty-state">
      <p v-if="filter === 'all'">暂无待办事项，添加一个吧！</p>
      <p v-else-if="filter === 'active'">没有未完成的待办事项</p>
      <p v-else>没有已完成的待办事项</p>
    </div>

    <div class="todo-list">
      <TodoItem
        v-for="todo in filteredTodos"
        :key="todo.id"
        :todo="todo"
        @edit="openEditForm(todo)"
        @delete="removeTodo(todo.id!)"
        @toggle-complete="toggleComplete(todo.id!)"
      />
    </div>

    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal">
        <h3>{{ isEditing ? '编辑待办事项' : '添加待办事项' }}</h3>
        <form @submit.prevent="saveTodo">
          <div class="form-group">
            <label for="todo-title">标题 *</label>
            <input
              type="text"
              id="todo-title"
              v-model="currentTodo.title"
              required
              autocomplete="off"
            />
          </div>

          <div class="form-group">
            <label for="todo-category">分类</label>
            <select id="todo-category" v-model="currentTodo.category">
              <option value="个人">个人</option>
              <option value="工作">工作</option>
              <option value="学习">学习</option>
              <option value="健康">健康</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div class="form-group">
            <label for="todo-dueDate">截止日期</label>
            <input type="date" id="todo-dueDate" autocomplete="off" v-model="currentTodo.dueDate" />
          </div>
          <div class="form-group">
            <label for="description">描述</label>
            <input
              type="textarea"
              id="description"
              autocomplete="off"
              v-model="currentTodo.description"
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
.todo-manager {
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

    .todo-stats {
      flex-grow: 1;
      margin-left: 1rem;
      display: flex;
      gap: 1rem;
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

  .filter-controls {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;

    .filter-button {
      background: none;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      cursor: pointer;
      font-weight: 500;
      color: var(--text-secondary);
      transition:
        background-color 0.2s,
        color 0.2s;

      &:hover,
      &.active {
        background-color: var(--accent-color);
        color: white;
      }
    }
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

  .todo-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
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

      input,
      select {
        width: 100%;
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
      input {
        width: calc(100% - 1.5rem);
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
