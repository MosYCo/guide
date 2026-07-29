/**
 * Favicon 服务
 * FR-008: 用户未提供图标时，优先通过 Google Favicon API 获取；
 * 获取失败或不存在时使用网站名称首字母作为降级图标
 * @see specs/001-bookmark-navigation/research.md §11
 */

import { extractDomain, getFaviconUrl } from '@/utils/url'

/**
 * 生成首字母图标（SVG data URI）。
 * @param name 书签名称
 */
export function getLetterIcon(name: string): string {
  const letter = (name.trim()[0] || '?').toUpperCase()
  const colors = ['#f97316', '#ea580c', '#f59e0b', '#d97706']
  const color = colors[letter.charCodeAt(0) % colors.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="6" fill="${color}"/>
    <text x="16" y="22" font-size="18" font-family="sans-serif" font-weight="600" fill="white" text-anchor="middle">${escapeXml(letter)}</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * T024: 终极降级——首字母图标也失败时的纯色块(SVG data URI)。
 * 用于 onError 链二次降级:favicon 失败 → 首字母 → 纯色块。
 */
export function getPlaceholderIcon(): string {
  // 单色块 + 书签符号,无需字体渲染,任何环境都能显示
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="6" fill="hsl(var(--muted))"/>
    <path d="M9 6h14v20l-7-4-7 4z" fill="hsl(var(--muted-foreground))" opacity="0.5"/>
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
  if (domain) return getFaviconUrl(domain)
  return getLetterIcon(name)
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
