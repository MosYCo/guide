/**
 * URL 工具函数
 * FR-002: 仅允许 http/https 协议，保存和打开前规范化，拒绝 javascript:/data: 等危险协议
 * @see specs/001-bookmark-navigation/research.md §1
 */

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

  // 补全协议头：缺少协议时默认 https://
  let candidate = trimmed
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
    candidate = `https://${candidate}`
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

  // 域名有效性检查
  const hostname = parsed.hostname.toLowerCase()
  if (!hostname || !hostname.includes('.')) {
    // 允许 localhost（开发场景），但必须含点或为 localhost
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return { valid: false, error: '域名无效' }
    }
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
 * 获取 Google Favicon API 的图标 URL。
 * @param domain 目标域名
 * @returns Favicon API URL
 */
export function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`
}
