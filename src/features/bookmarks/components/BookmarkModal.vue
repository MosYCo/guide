<script setup lang="ts">
import { computed } from 'vue'
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

const categoryOptions = computed(() => {
  const currentCategory = draft.value.cat.trim()
  const names = new Set(props.categories)

  if (currentCategory && currentCategory !== '__new__') {
    names.add(currentCategory)
  }

  return [...names]
})

const handleCategoryChange = (val: string) => {
  if (val !== '__new__') return

  draft.value.cat = props.categories[0] ?? '未分类'
  emit('requestCategory')
}
</script>

<template>
  <el-dialog
    :model-value="open"
    :title="editing ? '编辑书签' : '添加书签'"
    width="420px"
    :close-on-click-modal="false"
    @close="$emit('close')"
  >
    <el-form label-position="top" @submit.prevent="$emit('save')">
      <el-form-item label="名称">
        <el-input v-model="draft.title" placeholder="GitHub" />
      </el-form-item>
      <el-form-item label="网址">
        <el-input v-model="draft.url" placeholder="https://github.com" />
      </el-form-item>
      <el-form-item label="分类">
        <el-select
          :model-value="draft.cat"
          style="width: 100%"
          @update:model-value="(val: string) => { draft.cat = val; handleCategoryChange(val) }"
        >
          <el-option
            v-for="category in categoryOptions"
            :key="category"
            :label="category"
            :value="category"
          />
          <el-option label="+ 新分类" value="__new__" />
        </el-select>
      </el-form-item>
      <el-form-item label="图标（Emoji，可选）">
        <el-input v-model="draft.icon" placeholder="填写后优先显示 Emoji" maxlength="4" />
      </el-form-item>
      <el-form-item label="Favicon URL（可选）">
        <el-input v-model="draft.faviconUrl" placeholder="留空自动获取 favicon" />
      </el-form-item>
      <el-form-item label="标签（可选）">
        <el-input v-model="draft.tagsText" placeholder="用逗号或空格分隔" />
      </el-form-item>
      <el-form-item>
        <el-checkbox v-model="draft.pin">固定到 Dock</el-checkbox>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('close')">取消</el-button>
      <el-button type="primary" @click="$emit('save')">保存</el-button>
    </template>
  </el-dialog>
</template>
