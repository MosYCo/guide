/**
 * Favicon 服务
 * FR-008: 用户未提供图标时，优先通过 Google Favicon API 获取；
 * 获取失败或不存在时使用网站名称首字母作为降级图标
 */

import { extractDomain, getFaviconUrl } from '@/utils/url'

export type FaviconProvider = (domain: string) => string

const remoteFaviconsEnabled =
  (import.meta.env as Record<string, string | undefined>).VITE_FAVICON_REMOTE !== 'false'
const defaultProvider: FaviconProvider = (domain) =>
  remoteFaviconsEnabled ? getFaviconUrl(domain) : ''
let provider: FaviconProvider = defaultProvider

/**
 * 替换 favicon 来源。
 * 传 null 恢复默认 Google API;可注入本地缓存、站点 /favicon.ico 或返回空字符串禁用远程请求。
 */
export function setFaviconProvider(next: FaviconProvider | null): void {
  provider = next ?? defaultProvider
}

/**
 * 生成首字母图标（SVG data URI）。
 * @param name 书签名称
 */
export function getLetterIcon(name: string): string {
  // 用 code point 取首字符:name[0] 会把 emoji / 增补平面汉字截成半个代理项,
  // 后续 encodeURIComponent 会抛 URIError 并导致整页白屏。
  const letter = (Array.from(name.trim())[0] || '?').toUpperCase()
  const colors = ['#f97316', '#ea580c', '#f59e0b', '#d97706']
  const color = colors[letter.charCodeAt(0) % colors.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="6" fill="${color}"/>
    <text x="16" y="22" font-size="18" font-family="sans-serif" font-weight="600" fill="white" text-anchor="middle">${escapeXml(letter)}</text>
  </svg>`
  try {
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
  } catch {
    // 未配对的 UTF-16 代理项仍可能让 encodeURIComponent 抛错,
    // 兜底到不含用户文本的纯色块,避免整页崩溃。
    return getPlaceholderIcon()
  }
}

/**
 * T024: 终极降级——首字母图标也失败时的纯色块(SVG data URI)。
 * 用于 onError 链二次降级:favicon 失败 → 首字母 → 纯色块。
 */
export function getPlaceholderIcon(): string {
  // 单色块 + 书签符号。data URI 是独立文档,不能用宿主 CSS 变量,否则 var() 无效回退黑色。
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="6" fill="#d1d5db"/>
    <path d="M9 6h14v20l-7-4-7 4z" fill="#6b7280" opacity="0.6"/>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * 解析书签图标 URL。
 * - 用户提供了 icon → 直接使用
 * - 未提供 → 使用 Google Favicon API
 * @param url 书签 URL（用于提取域名）
 * @param name 书签名称（用于首字母降级）
 * @param icon 用户提供的图标 URL（可选）
 */
export function resolveIcon(url: string, name: string, icon?: string): string {
  if (icon && icon.trim()) return icon.trim()
  const domain = extractDomain(url)
  if (!domain) return getLetterIcon(name)
  try {
    // provider 返回空串表示禁用远程图标,直接走首字母降级
    return provider(domain).trim() || getLetterIcon(name)
  } catch {
    return getLetterIcon(name)
  }
}

/**
 * 获取降级首字母图标（当 favicon 加载失败时调用）。
 */
export function fallbackIcon(name: string): string {
  return getLetterIcon(name)
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case "'":
        return '&apos;'
      case '"':
        return '&quot;'
      default:
        return c
    }
  })
}
