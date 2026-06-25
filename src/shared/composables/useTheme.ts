import { computed, ref } from 'vue'

export interface ThemeDefinition {
  id: string
  label: string
  icon: 'sun' | 'zap' | 'moon' | 'sunrise'
}

const THEME_STORAGE_KEY = 'guide_theme'

export const themes: ThemeDefinition[] = [
  { id: 'dark-amber', label: '深色 · 琥珀', icon: 'sun' },
  { id: 'cyber-teal', label: '赛博 · 青', icon: 'zap' },
  { id: 'ink-mono', label: '墨 · 单色', icon: 'moon' },
  { id: 'light', label: '浅色', icon: 'sunrise' },
]

const getInitialTheme = () => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  return themes.some((theme) => theme.id === savedTheme) ? savedTheme! : themes[0].id
}

export const useTheme = () => {
  const themeId = ref(getInitialTheme())

  const currentTheme = computed(() => themes.find((theme) => theme.id === themeId.value) ?? themes[0])

  const applyTheme = () => {
    document.documentElement.setAttribute('data-theme', themeId.value)
    localStorage.setItem(THEME_STORAGE_KEY, themeId.value)
  }

  const cycleTheme = () => {
    const currentIndex = themes.findIndex((theme) => theme.id === themeId.value)
    themeId.value = themes[(currentIndex + 1) % themes.length].id
    applyTheme()
  }

  applyTheme()

  return {
    themeId,
    currentTheme,
    cycleTheme,
  }
}
