<script setup lang="ts">
import { computed } from 'vue'
import IconDelete from '../icons/IconDelete.vue'
import IconEdit from '../icons/IconEdit.vue'

const props = defineProps<{
  todo: Entity.Todo
}>()

const emit = defineEmits(['edit', 'delete', 'toggle-complete'])

const formattedDate = (date: Date) => {
  return new Date(date).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const categoryColors = {
  个人: '#4cc9f0',
  工作: '#4361ee',
  学习: '#3a0ca3',
  健康: '#2ecc71',
  其他: '#9b5de5',
}

const categoryColor = computed(() => {
  return categoryColors[props.todo.category as keyof typeof categoryColors] || '#6c757d'
})

const isOverdue = computed(() => {
  if (!props.todo.dueDate || props.todo.completed) return false
  return new Date(props.todo.dueDate) < new Date()
})
</script>

<template>
  <div :class="['todo-item', { completed: todo.completed, overdue: isOverdue }]">
    <div class="todo-checkbox" @click="emit('toggle-complete')">
      <input type="checkbox" :checked="todo.completed === 1" />
      <span class="checkmark"></span>
    </div>

    <div class="todo-content">
      <div class="todo-header">
        <h3 class="todo-title">{{ todo.title }}</h3>
        <span class="todo-category" :style="{ backgroundColor: categoryColor }">
          {{ todo.category }}
        </span>
      </div>

      <div class="todo-details">
        <div class="todo-detail-item">
          <span class="created-date"> 创建: {{ formattedDate(todo.createdAt) }} </span>
          <span v-if="todo.completed && todo.completedAt" class="completed-date">
            完成: {{ formattedDate(todo.completedAt) }}
          </span>
          <span v-if="todo.dueDate" :class="['due-date', { overdue: isOverdue }]">
            截止: {{ formattedDate(todo.dueDate) }}
          </span>
          <div v-if="todo.description" class="todo-desc">
            <span>描述：{{ todo.description }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="todo-actions">
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
.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.2rem;
  background-color: var(--bg-card);
  border-radius: 10px;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);

    .dark-theme & {
      background-color: rgba(255, 255, 255, 0.05);
    }
  }

  &.completed {
    opacity: 0.7;

    .todo-title {
      text-decoration: line-through;
      color: var(--text-secondary);
    }
  }

  &.overdue .due-date {
    color: var(--error-color);
    font-weight: 600;
  }
}

.todo-checkbox {
  position: relative;
  cursor: pointer;
  margin-top: 0.2rem;

  input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;

    &:checked ~ .checkmark {
      background-color: var(--success-color);
      border-color: var(--success-color);

      &::after {
        display: block;
      }
    }
  }

  .checkmark {
    position: relative;
    display: inline-block;
    height: 20px;
    width: 20px;
    background-color: transparent;
    border: 2px solid var(--border-color);
    border-radius: 4px;
    transition:
      background-color 0.2s,
      border-color 0.2s;

    &::after {
      content: '';
      position: absolute;
      display: none;
      left: 7px;
      top: 2px;
      width: 5px;
      height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
  }

  &:hover input ~ .checkmark {
    border-color: var(--accent-color);
  }
}

.todo-content {
  flex-grow: 1;
}

.todo-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.todo-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
}

.todo-category {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: white;
  text-transform: uppercase;
}

.todo-detail-item {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  font-size: 0.8rem;
  color: var(--text-secondary);

  span {
    display: flex;
    align-items: center;

    &::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background-color: currentColor;
      margin-right: 0.5rem;
    }
  }
}

.todo-actions {
  display: flex;
  gap: 0.25rem;

  .action-button {
    background: none;
    border: none;
    padding: 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition: color 0.2s;
    border-radius: 4px;

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
