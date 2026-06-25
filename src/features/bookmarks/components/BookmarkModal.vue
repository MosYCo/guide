<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { BookmarkDraft } from '../types'

const draft = defineModel<BookmarkDraft>('draft', { required: true })

const props = defineProps<{
  open: boolean
  editing: boolean
  categories: string[]
}>()

const emit = defineEmits<{
  close: []
  save: []
  addCategory: [category: string]
}>()

const titleInput = ref<HTMLInputElement>()

watch(
  () => props.open,
  (open) => {
    if (open) {
      nextTick(() => titleInput.value?.focus())
    }
  },
)

const handleCategoryChange = () => {
  if (draft.value.cat !== '__new__') return

  const name = window.prompt('输入新分类名称：')?.trim()
  if (name) {
    emit('addCategory', name)
    draft.value.cat = name
  } else {
    draft.value.cat = props.categories[0] ?? '未分类'
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement
  if (event.key === 'Enter' && target.tagName !== 'SELECT' && (target as HTMLInputElement).type !== 'checkbox') {
    emit('save')
  }
}
</script>

<template>
  <div v-if="open" class="overlay open" @click.self="$emit('close')">
    <div class="modal" @keydown="handleKeydown">
      <h3>{{ editing ? '编辑书签' : '添加书签' }}</h3>
      <div class="field">
        <label>名称</label>
        <input ref="titleInput" v-model="draft.title" type="text" placeholder="GitHub" />
      </div>
      <div class="field">
        <label>网址</label>
        <input v-model="draft.url" type="url" placeholder="https://github.com" />
      </div>
      <div class="field">
        <label>分类</label>
        <select v-model="draft.cat" @change="handleCategoryChange">
          <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
          <option value="__new__">+ 新分类</option>
        </select>
      </div>
      <div class="field">
        <label>图标（Emoji，可选）</label>
        <input v-model="draft.icon" type="text" placeholder="留空自动获取 favicon" maxlength="4" />
      </div>
      <div class="field">
        <label class="check-field">
          <input v-model="draft.pin" type="checkbox" />
          固定到 Dock
        </label>
      </div>
      <div class="modal-ft">
        <button class="btn" @click="$emit('close')">取消</button>
        <button class="btn btn-acc" @click="$emit('save')">保存</button>
      </div>
    </div>
  </div>
</template>
