/**
 * URL 工具函数
 * 仅允许 http/https 协议，保存和打开前规范化，拒绝 javascript:/data: 等危险协议
 */

import { toUnicode } from 'punycode'
import type { UrlValidationResult } from '@/types'

/** 允许的协议白名单 */
const ALLOWED_PROTOCOLS = ['http:', 'https:']

/**
 * 验证并规范化 URL。
 * - 仅允许 http/https 协议
 * - 拒绝 javascript:/data:/file: 等危险协议
 * - 自动补全协议头（无协议时默认 https://）
 * - 小写化域名
 * @param input 用户输入的 URL 字符串
 * @returns 验证结果（含规范化后的 URL 和域名）
 */
export function validateAndNormalizeUrl(input: string): UrlValidationResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { valid: false, error: 'URL 不能为空' }
  }

  // 补全协议头:
  // - 只有显式 scheme:// 或危险协议才按原样解析
  // - localhost / 回环地址默认 http,其余默认 https
  // 这样裸 localhost:3000、example.com:8080 不会被误判为协议
  const hasExplicitScheme =
    /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ||
    /^(?:javascript|data|file|mailto|tel|ftp|blob):/i.test(trimmed)
  let candidate = trimmed
  if (!hasExplicitScheme) {
    const isLocal = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:[/?#]|$)/i.test(trimmed)
    candidate = `${isLocal ? 'http' : 'https'}://${trimmed}`
  }

  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    return { valid: false, error: 'URL 格式无效' }
  }

  // 协议白名单检查
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return {
      valid: false,
      error: `仅允许 http/https 协议，拒绝 ${parsed.protocol}`,
    }
  }

  // 允许单标签主机(内网 NAS)、IPv4/IPv6 与 localhost;URL 解析器已拒绝非法 host
  const hostname = parsed.hostname.toLowerCase()
  if (!hostname) {
    return { valid: false, error: '域名无效' }
  }

  // 小写化域名后重建 URL
  parsed.hostname = hostname

  return {
    valid: true,
    normalized: parsed.toString(),
    domain: hostname,
  }
}

/**
 * 从 URL 提取域名（不含协议和路径）。
 * 输入无效时返回空字符串。
 */
export function extractDomain(input: string): string {
  const result = validateAndNormalizeUrl(input)
  return result.domain ?? ''
}

/**
 * 展示/搜索用域名:把 punycode 转回 Unicode,中文域名不显示 xn-- 串。
 * 网络请求仍使用 extractDomain 的 ASCII 形式。
 */
export function displayDomain(input: string): string {
  const domain = extractDomain(input)
  if (!domain) return ''
  try {
    return toUnicode(domain)
  } catch {
    return domain
  }
}

/**
 * 获取 Google Favicon API 的图标 URL。
 * @param domain 目标域名
 * @returns Favicon API URL
 */
export function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`
}
