import { describe, it, expect } from 'vitest'
import {
  CATEGORY_ICON_PRESETS,
  formatCategoryIcon,
  normalizeCategoryIcon,
  parseCategoryIcon,
} from '@/utils/categoryIcon'

describe('分类图标 token', () => {
  it('解析无颜色与带颜色的预置 token', () => {
    expect(parseCategoryIcon('lucide:briefcase')).toEqual({
      key: 'briefcase',
      color: undefined,
    })
    expect(parseCategoryIcon('lucide:briefcase@blue')).toEqual({
      key: 'briefcase',
      color: 'blue',
    })
  })

  it('未知 key 返回 null，未知颜色被忽略，多余分段返回 null', () => {
    expect(parseCategoryIcon('lucide:unknown')).toBeNull()
    expect(parseCategoryIcon('lucide:briefcase@unknown')).toEqual({
      key: 'briefcase',
      color: undefined,
    })
    expect(parseCategoryIcon('lucide:briefcase@blue@red')).toBeNull()
    expect(parseCategoryIcon('briefcase')).toBeNull()
    expect(parseCategoryIcon('lucide:')).toBeNull()
  })

  it('格式化预置 token', () => {
    expect(formatCategoryIcon('book-open')).toBe('lucide:book-open')
    expect(formatCategoryIcon('book-open', 'green')).toBe('lucide:book-open@green')
  })

  it('规范化图片 URL、data URI 与预置 token', () => {
    expect(normalizeCategoryIcon(' https://example.com/a.png ')).toBe('https://example.com/a.png')
    expect(normalizeCategoryIcon('data:image/png;base64,abc')).toBe('data:image/png;base64,abc')
    expect(normalizeCategoryIcon('lucide:briefcase@blue')).toBe('lucide:briefcase@blue')
    expect(normalizeCategoryIcon('lucide:briefcase@unknown')).toBe('lucide:briefcase')
    expect(normalizeCategoryIcon(' lucide:briefcase ')).toBe('lucide:briefcase')
  })

  it('拒绝非法协议、未知预置与非字符串', () => {
    expect(normalizeCategoryIcon('javascript:alert(1)')).toBeUndefined()
    expect(normalizeCategoryIcon('lucide:unknown')).toBeUndefined()
    expect(normalizeCategoryIcon('   ')).toBeUndefined()
    expect(normalizeCategoryIcon(123)).toBeUndefined()
  })

  it('预置 key 唯一', () => {
    const keys = CATEGORY_ICON_PRESETS.map((preset) => preset.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
