import { computed, ref } from 'vue'

export interface ThemeDefinition {
  id: string
  label: string
  icon: 'sun' | 'zap' | 'moon' | 'sunrise'
  dark: boolean
  /** Approximation of the theme's --bg, for the browser chrome (meta theme-color). */
  chromeColor: string
}

const THEME_STORAGE_KEY = 'guide_theme'

export const themes: ThemeDefinition[] = [
  { id: 'light', label: '浅色', icon: 'sunrise', dark: false, chromeColor: '#f5f5f7' },
  { id: 'dark-amber', label: '深色 · 琥珀', icon: 'sun', dark: true, chromeColor: '#121317' },
  { id: 'cyber-teal', label: '赛博 · 青', icon: 'zap', dark: true, chromeColor: '#0e1016' },
  { id: 'ink-mono', label: '墨 · 单色', icon: 'moon', dark: true, chromeColor: '#0d0d0d' },
]

const getInitialTheme = () => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  if (themes.some((theme) => theme.id === savedTheme)) return savedTheme!

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark-amber' : 'light'
}

export const useTheme = () => {
  const themeId = ref(getInitialTheme())

  const currentTheme = computed(
    () => themes.find((theme) => theme.id === themeId.value) ?? themes[0],
  )

  const applyTheme = () => {
    const theme = currentTheme.value
    document.documentElement.setAttribute('data-theme', theme.id)
    // Element Plus dark tokens activate on html.dark
    document.documentElement.classList.toggle('dark', theme.dark)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme.chromeColor)
  }

  const saveTheme = () => {
    localStorage.setItem(THEME_STORAGE_KEY, themeId.value)
  }

  const cycleTheme = () => {
    const currentIndex = themes.findIndex((theme) => theme.id === themeId.value)
    themeId.value = themes[(currentIndex + 1) % themes.length].id
    applyTheme()
    saveTheme()
  }

  applyTheme()

  return {
    themeId,
    currentTheme,
    cycleTheme,
  }
}
