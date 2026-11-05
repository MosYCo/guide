/**
 * CategoryIcon 组件 - 分类图标
 * 优先显示预置图标或自定义图片;缺省或加载失败时按场景回退首字符 / Folder
 */

import { useEffect, useState } from 'react'
import { Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseCategoryIcon } from '@/utils/categoryIcon'
import { ALLOWED_ICON_URL_PATTERN } from '@/utils/url'
import {
  PRESET_ICON_COLOR_CLASSES,
  PRESET_ICON_COMPONENTS,
} from '@/components/category/categoryIconRegistry'
import type { Category } from '@/types'

type CategoryIconSource = Pick<Category, 'name' | 'icon'>

export interface CategoryIconProps {
  /** 分类;未提供时(如"全部"项)直接显示 Folder */
  category?: CategoryIconSource
  /** 无图标或加载失败时的兜底:折叠态用首字符,展开态用文件夹 */
  fallback?: 'letter' | 'folder'
  /** 图片 / 文件夹图标的尺寸与颜色 */
  className?: string
}

export function CategoryIcon({ category, fallback = 'folder', className }: CategoryIconProps) {
  const [failed, setFailed] = useState(false)
  const icon = category?.icon?.trim() ?? ''

  // 图标被编辑后重新尝试加载,避免一次失败后永久停在兜底态
  useEffect(() => {
    setFailed(false)
  }, [icon])

  if (!category) {
    return <Folder aria-hidden="true" className={cn('h-4 w-4 shrink-0', className)} />
  }

  const preset = parseCategoryIcon(icon)
  if (preset) {
    const Icon = PRESET_ICON_COMPONENTS[preset.key]
    return (
      <Icon
        aria-hidden="true"
        data-testid="category-icon-preset"
        className={cn(
          'h-4 w-4 shrink-0',
          preset.color && PRESET_ICON_COLOR_CLASSES[preset.color],
          className,
        )}
      />
    )
  }

  if (icon && ALLOWED_ICON_URL_PATTERN.test(icon) && !failed) {
    return (
      <img
        src={icon}
        alt=""
        aria-hidden="true"
        data-testid="category-icon"
        referrerPolicy="no-referrer"
        className={cn('h-4 w-4 shrink-0 rounded-sm object-cover', className)}
        onError={() => setFailed(true)}
      />
    )
  }

  if (fallback === 'letter') {
    return (
      <span
        aria-hidden="true"
        data-testid="category-icon-fallback"
        className="text-xs font-semibold"
      >
        {Array.from(category.name.trim())[0] ?? '?'}
      </span>
    )
  }

  return <Folder aria-hidden="true" className={cn('h-4 w-4 shrink-0', className)} />
}
