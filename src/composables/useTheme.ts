import { ref } from 'vue'

export const useTheme = () => {
  const isDarkTheme = ref(false)

  // 从localStorage或系统偏好加载主题
  const loadTheme = () => {
    const savedTheme = localStorage.getItem('theme')
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      isDarkTheme.value = true
      document.documentElement.classList.add('dark')
    } else {
      isDarkTheme.value = false
      document.documentElement.classList.remove('dark')
    }
  }

  // 切换主题
  const toggleTheme = () => {
    isDarkTheme.value = !isDarkTheme.value
    localStorage.setItem('theme', isDarkTheme.value ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', isDarkTheme.value)
  }

  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      isDarkTheme.value = e.matches
      document.documentElement.classList.toggle('dark', e.matches)
    }
  })

  // 初始化加载主题
  loadTheme()

  return {
    isDarkTheme,
    toggleTheme
  }
}
