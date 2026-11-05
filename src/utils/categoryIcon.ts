/**
 * 分类图标值工具
 * 支持图片 URL 与预置图标 token：lucide:<key>[@<color>]
 */

import { ALLOWED_ICON_URL_PATTERN } from '@/utils/url'

/** 预置图标清单；key 同时用于持久化 token */
export const CATEGORY_ICON_PRESETS = [
  { key: 'briefcase', label: '工作' },
  { key: 'graduation-cap', label: '学习' },
  { key: 'book-open', label: '阅读' },
  { key: 'home', label: '生活' },
  { key: 'users', label: '家庭' },
  { key: 'gamepad-2', label: '娱乐' },
  { key: 'music', label: '音乐' },
  { key: 'film', label: '影视' },
  { key: 'camera', label: '摄影' },
  { key: 'joystick', label: '游戏' },
  { key: 'shopping-bag', label: '购物' },
  { key: 'utensils', label: '美食' },
  { key: 'plane', label: '旅行' },
  { key: 'dumbbell', label: '运动' },
  { key: 'heart-pulse', label: '健康' },
  { key: 'wallet', label: '财务' },
  { key: 'message-circle', label: '社交' },
  { key: 'code-2', label: '开发' },
  { key: 'palette', label: '设计' },
  { key: 'lightbulb', label: '灵感' },
  { key: 'star', label: '收藏' },
  { key: 'newspaper', label: '新闻' },
  { key: 'wrench', label: '工具' },
  { key: 'cpu', label: '技术' },
  { key: 'zap', label: '效率' },
  { key: 'target', label: '目标' },
  { key: 'calendar', label: '时间' },
  { key: 'paw-print', label: '宠物' },
  { key: 'languages', label: '外语' },
  { key: 'shapes', label: '其他' },
] as const

export type CategoryIconPresetKey = (typeof CATEGORY_ICON_PRESETS)[number]['key']

/** 固定色板；不提供自由取色，保证亮/暗主题下的一致性 */
export const CATEGORY_ICON_COLORS = [
  { key: 'blue', label: '蓝色' },
  { key: 'cyan', label: '青色' },
  { key: 'green', label: '绿色' },
  { key: 'orange', label: '橙色' },
  { key: 'red', label: '红色' },
  { key: 'violet', label: '紫色' },
  { key: 'pink', label: '粉色' },
  { key: 'gray', label: '灰色' },
] as const

export type CategoryIconColorKey = (typeof CATEGORY_ICON_COLORS)[number]['key']

const PRESET_KEYS = new Set<string>(CATEGORY_ICON_PRESETS.map((preset) => preset.key))
const COLOR_KEYS = new Set<string>(CATEGORY_ICON_COLORS.map((color) => color.key))

export const PRESET_ICON_PREFIX = 'lucide:'

export interface CategoryPresetIcon {
  key: CategoryIconPresetKey
  color?: CategoryIconColorKey
}

/**
 * 解析预置图标 token。
 * 未知 key 返回 null；未知颜色只忽略颜色，图标本身仍有效。
 */
export function parseCategoryIcon(value: string): CategoryPresetIcon | null {
  if (!value.startsWith(PRESET_ICON_PREFIX)) return null
  const [key, color, extra] = value.slice(PRESET_ICON_PREFIX.length).split('@')
  if (!key || !PRESET_KEYS.has(key) || extra !== undefined) return null
  return {
    key: key as CategoryIconPresetKey,
    color: color && COLOR_KEYS.has(color) ? (color as CategoryIconColorKey) : undefined,
  }
}

/** 生成预置图标 token，例如 lucide:briefcase@blue */
export function formatCategoryIcon(
  key: CategoryIconPresetKey,
  color?: CategoryIconColorKey,
): string {
  return `${PRESET_ICON_PREFIX}${key}${color ? `@${color}` : ''}`
}

/**
 * 规范化分类图标值：
 * - 图片 URL / data:image 原样保留
 * - 预置 token 校验 key 与颜色并重建
 * - 非法值返回 undefined，由调用方决定报错或按未设置处理
 */
export function normalizeCategoryIcon(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (ALLOWED_ICON_URL_PATTERN.test(trimmed)) return trimmed
  const preset = parseCategoryIcon(trimmed)
  return preset ? formatCategoryIcon(preset.key, preset.color) : undefined
}
