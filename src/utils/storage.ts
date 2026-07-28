/**
 * 存储工具
 * - localStorage 读写（主题持久化）
 * - 无痕模式检测（SC-003 边界）
 * - navigator.storage.persist 请求
 * @see specs/001-bookmark-navigation/research.md §2
 */

const THEME_KEY = 'bookmark-theme'

/** 读取持久化的主题偏好 */
export function getStoredTheme(): 'light' | 'dark' | 'system' | null {
  const v = localStorage.getItem(THEME_KEY)
  if (v === 'light' || v === 'dark' || v === 'system') return v
  return null
}

/** 持久化主题偏好 */
export function setStoredTheme(theme: 'light' | 'dark' | 'system'): void {
  localStorage.setItem(THEME_KEY, theme)
}

/**
 * 请求持久化存储权限（减少浏览器驱逐风险）。
 * 返回是否已持久化或请求成功。
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persisted?.()
    if (isPersisted) return true
    return navigator.storage.persist()
  }
  return false
}

/**
 * 启发式检测无痕/隐私模式。
 * 通过 localStorage 写入测试判断（无痕模式下某些浏览器会抛错或非持久）。
 */
export function detectIncognito(): boolean {
  try {
    const testKey = '__incognito_test__'
    localStorage.setItem(testKey, '1')
    localStorage.removeItem(testKey)
    return false
  } catch {
    return true
  }
}
