<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    tone?: 'default' | 'danger'
    inputLabel?: string
    inputPlaceholder?: string
    inputValue?: string
  }>(),
  {
    message: '',
    confirmLabel: '确认',
    cancelLabel: '取消',
    tone: 'default',
    inputLabel: '',
    inputPlaceholder: '',
    inputValue: '',
  },
)

const emit = defineEmits<{
  cancel: []
  confirm: [value?: string]
}>()

const input = ref<HTMLInputElement>()
const confirmButton = ref<HTMLButtonElement>()
const value = ref('')

watch(
  () => props.open,
  (open) => {
    if (!open) return

    value.value = props.inputValue
    nextTick(() => {
      if (props.inputLabel) {
        input.value?.focus()
        return
      }

      confirmButton.value?.focus()
    })
  },
)

const handleConfirm = () => {
  emit('confirm', props.inputLabel ? value.value.trim() : undefined)
}
</script>

<template>
  <div v-if="open" class="overlay open" @click.self="$emit('cancel')">
    <div
      class="modal dialog-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      @keydown.esc.prevent="$emit('cancel')"
    >
      <h3 id="confirm-dialog-title">{{ title }}</h3>
      <p v-if="message" class="dialog-message">{{ message }}</p>
      <div v-if="inputLabel" class="field">
        <label for="confirm-dialog-input">{{ inputLabel }}</label>
        <input
          id="confirm-dialog-input"
          ref="input"
          v-model="value"
          type="text"
          :placeholder="inputPlaceholder"
          @keydown.enter.prevent="handleConfirm"
        />
      </div>
      <div class="modal-ft">
        <button class="btn" @click="$emit('cancel')">{{ cancelLabel }}</button>
        <button
          ref="confirmButton"
          :class="['btn', tone === 'danger' ? 'btn-danger' : 'btn-acc']"
          @click="handleConfirm"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
