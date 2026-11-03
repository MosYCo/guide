import { describe, it, expect, vi, afterEach } from 'vitest'
import { safeGetItem, safeSetItem, getStoredTheme, describeStorageError } from '@/utils/storage'

describe('storage 安全封装', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('localStorage 抛 SecurityError 时退回内存', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    safeSetItem('test-key', 'value')
    expect(safeGetItem('test-key')).toBe('value')
    expect(getStoredTheme()).toBeNull()
  })

  it('非法主题值解析为 null(由 useTheme 回退 system)', () => {
    localStorage.setItem('bookmark-theme', 'purple')
    expect(getStoredTheme()).toBeNull()
    localStorage.removeItem('bookmark-theme')
  })

  it('配额异常给出可操作提示', () => {
    expect(describeStorageError(new DOMException('full', 'QuotaExceededError'))).toContain('导出')
    expect(describeStorageError(new Error('boom'))).toBe('boom')
  })
})
