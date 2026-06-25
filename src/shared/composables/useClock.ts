import { onBeforeUnmount, ref } from 'vue'

const formatTime = () => {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

export const useClock = () => {
  const time = ref(formatTime())
  const timer = window.setInterval(() => {
    time.value = formatTime()
  }, 10000)

  onBeforeUnmount(() => {
    window.clearInterval(timer)
  })

  return { time }
}
