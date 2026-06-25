import { ref } from 'vue'

export const useToast = () => {
  const message = ref('')
  const isVisible = ref(false)
  let timer: number | undefined

  const showToast = (nextMessage: string) => {
    if (timer) {
      window.clearTimeout(timer)
    }

    message.value = nextMessage
    isVisible.value = true
    timer = window.setTimeout(() => {
      isVisible.value = false
    }, 2400)
  }

  return {
    message,
    isVisible,
    showToast,
  }
}
