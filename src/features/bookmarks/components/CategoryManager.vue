<script setup lang="ts">
import { computed, ref } from 'vue'
import { UNCATEGORIZED_CATEGORY } from '../constants'
import type { CategorySummary, DockMoveDirection } from '../types'

const props = defineProps<{
  open: boolean
  categories: CategorySummary[]
}>()

const emit = defineEmits<{
  close: []
  rename: [from: string, to: string]
  merge: [from: string, to: string]
  move: [category: string, direction: DockMoveDirection]
  hide: [category: string, hidden: boolean]
  delete: [category: string]
}>()

const renameDraft = ref<Record<string, string>>({})
const mergeTarget = ref<Record<string, string>>({})

const categoryNames = computed(() => props.categories.map((category) => category.name))

const commitRename = (category: string) => {
  const nextName = renameDraft.value[category]?.trim()
  if (!nextName || nextName === category) return
  emit('rename', category, nextName)
  renameDraft.value[category] = ''
}
</script>

<template>
  <div v-if="open" class="overlay open" @click.self="$emit('close')">
    <div
      class="modal manager-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-manager-title"
    >
      <h3 id="category-manager-title">分类管理</h3>
      <div class="manager-list">
        <div v-for="(category, index) in categories" :key="category.name" class="manager-row">
          <div class="manager-main">
            <span class="manager-name">{{ category.name }}</span>
            <span class="manager-meta">{{ category.count }} 个书签</span>
          </div>
          <div class="manager-controls">
            <button
              class="mini-btn"
              :disabled="index === 0"
              title="上移"
              @click="$emit('move', category.name, 'left')"
            >
              ↑
            </button>
            <button
              class="mini-btn"
              :disabled="index === categories.length - 1"
              title="下移"
              @click="$emit('move', category.name, 'right')"
            >
              ↓
            </button>
            <input
              v-model="renameDraft[category.name]"
              class="mini-input"
              type="text"
              placeholder="重命名"
            />
            <button
              class="mini-btn"
              :disabled="category.name === UNCATEGORIZED_CATEGORY"
              @click="commitRename(category.name)"
            >
              改名
            </button>
            <select
              v-model="mergeTarget[category.name]"
              class="mini-select"
              :disabled="category.name === UNCATEGORIZED_CATEGORY"
            >
              <option value="">合并到...</option>
              <option
                v-for="name in categoryNames.filter((name) => name !== category.name)"
                :key="name"
                :value="name"
              >
                {{ name }}
              </option>
            </select>
            <button
              class="mini-btn"
              :disabled="!mergeTarget[category.name] || category.name === UNCATEGORIZED_CATEGORY"
              @click="$emit('merge', category.name, mergeTarget[category.name])"
            >
              合并
            </button>
            <button
              class="mini-btn"
              :disabled="category.name === UNCATEGORIZED_CATEGORY"
              @click="$emit('hide', category.name, !category.hidden)"
            >
              {{ category.hidden ? '恢复' : '隐藏' }}
            </button>
            <button
              class="mini-btn danger"
              :disabled="category.name === UNCATEGORIZED_CATEGORY"
              @click="$emit('delete', category.name)"
            >
              删除
            </button>
          </div>
        </div>
      </div>
      <div class="modal-ft">
        <button class="btn btn-acc" @click="$emit('close')">完成</button>
      </div>
    </div>
  </div>
</template>
