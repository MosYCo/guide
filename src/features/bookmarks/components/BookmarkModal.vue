<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
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
  requestCategory: []
}>()

const titleInput = ref<HTMLInputElement>()
const modal = ref<HTMLElement>()
let previousFocus: HTMLElement | null = null

const categoryOptions = computed(() => {
  const currentCategory = draft.value.cat.trim()
  const names = new Set(props.categories)

  if (currentCategory && currentCategory !== '__new__') {
    names.add(currentCategory)
  }

  return [...names]
})

const getFocusableElements = () => {
  if (!modal.value) return []

  return [
    ...modal.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((element) => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden'))
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      nextTick(() => titleInput.value?.focus())
    } else {
      previousFocus?.focus()
      previousFocus = null
    }
  },
)

const handleCategoryChange = () => {
  if (draft.value.cat !== '__new__') return

  draft.value.cat = props.categories[0] ?? '未分类'
  emit('requestCategory')
}

const handleKeydown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement
  if (event.key === 'Tab') {
    const focusable = getFocusableElements()
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (!first || !last) return

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
      return
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
      return
    }
  }

  if (
    event.key === 'Enter' &&
    !event.isComposing &&
    target.tagName !== 'SELECT' &&
    (target as HTMLInputElement).type !== 'checkbox'
  ) {
    emit('save')
  }
}
</script>

<template>
  <div v-if="open" class="overlay open" @click.self="$emit('close')">
    <div
      ref="modal"
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bookmark-modal-title"
      @keydown="handleKeydown"
    >
      <h3 id="bookmark-modal-title">{{ editing ? '编辑书签' : '添加书签' }}</h3>
      <div class="field">
        <label for="bookmark-title">名称</label>
        <input
          id="bookmark-title"
          ref="titleInput"
          v-model="draft.title"
          type="text"
          placeholder="GitHub"
        />
      </div>
      <div class="field">
        <label for="bookmark-url">网址</label>
        <input id="bookmark-url" v-model="draft.url" type="url" placeholder="https://github.com" />
      </div>
      <div class="field">
        <label for="bookmark-category">分类</label>
        <select id="bookmark-category" v-model="draft.cat" @change="handleCategoryChange">
          <option v-for="category in categoryOptions" :key="category" :value="category">
            {{ category }}
          </option>
          <option value="__new__">+ 新分类</option>
        </select>
      </div>
      <div class="field">
        <label for="bookmark-icon">图标（Emoji，可选）</label>
        <input
          id="bookmark-icon"
          v-model="draft.icon"
          type="text"
          placeholder="填写后优先显示 Emoji"
          maxlength="4"
        />
      </div>
      <div class="field">
        <label for="bookmark-favicon">Favicon URL（可选）</label>
        <input
          id="bookmark-favicon"
          v-model="draft.faviconUrl"
          type="url"
          placeholder="留空自动获取 favicon"
        />
      </div>
      <div class="field">
        <label for="bookmark-tags">标签（可选）</label>
        <input
          id="bookmark-tags"
          v-model="draft.tagsText"
          type="text"
          placeholder="用逗号或空格分隔"
        />
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
