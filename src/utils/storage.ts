/**
 * 存储工具
 * - localStorage 读写（主题持久化）
 * - 无痕模式检测（边界）
 * - navigator.storage.persist 请求
 */

const THEME_KEY = 'bookmark-theme'
const memoryFallback = new Map<string, string>()

/**
 * localStorage 可能因禁用站点数据/沙箱 iframe 抛 SecurityError。
 * 失败时退回进程内 Map,保证首屏不崩溃(本次会话内仍可读写)。
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return memoryFallback.get(key) ?? null
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    memoryFallback.set(key, value)
  }
}

/** 读取持久化的主题偏好 */
export function getStoredTheme(): 'light' | 'dark' | 'system' | null {
  const v = safeGetItem(THEME_KEY)
  if (v === 'light' || v === 'dark' || v === 'system') return v
  return null
}

/** 持久化主题偏好 */
export function setStoredTheme(theme: 'light' | 'dark' | 'system'): void {
  safeSetItem(THEME_KEY, theme)
}

/** 把存储/配额异常翻译成可操作的用户提示 */
export function describeStorageError(error: unknown): string {
  if (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  ) {
    return '存储空间不足,请先导出书签并清理旧数据'
  }
  return error instanceof Error ? error.message : '操作失败'
}

/**
 * 请求持久化存储权限（减少浏览器驱逐风险）。
 * 返回是否已持久化或请求成功。
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    const isPersisted = await navigator.storage.persisted?.()
    if (isPersisted) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
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
