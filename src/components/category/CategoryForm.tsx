/**
 * CategoryForm 组件 - 添加/编辑分类表单
 * 创建、编辑名称与可选图标（预置图标 + 固定色板，或图片 URL）
 */

import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { CategoryIcon } from '@/components/category/CategoryIcon'
import {
  PRESET_ICON_COLOR_CLASSES,
  PRESET_ICON_COMPONENTS,
} from '@/components/category/categoryIconRegistry'
import type { Category } from '@/types'
import {
  CATEGORY_ICON_COLORS,
  CATEGORY_ICON_PRESETS,
  formatCategoryIcon,
  normalizeCategoryIcon,
  parseCategoryIcon,
  type CategoryIconColorKey,
  type CategoryIconPresetKey,
} from '@/utils/categoryIcon'
import { describeStorageError } from '@/utils/storage'
import { cn } from '@/lib/utils'

export interface CategoryFormProps {
  open: boolean
  category?: Category | null
  onSubmit: (name: string, icon: string) => Promise<void> | void
  onCancel: () => void
}

export function CategoryForm({ open, category, onSubmit, onCancel }: CategoryFormProps) {
  const isEdit = !!category
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [iconUrl, setIconUrl] = useState('')
  const [presetKey, setPresetKey] = useState<CategoryIconPresetKey | null>(null)
  const [presetColor, setPresetColor] = useState<CategoryIconColorKey | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [iconError, setIconError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const storedIcon = category?.icon?.trim() ?? ''
      const preset = parseCategoryIcon(storedIcon)
      setName(category?.name ?? '')
      if (preset) {
        setIcon(formatCategoryIcon(preset.key, preset.color))
        setPresetKey(preset.key)
        setPresetColor(preset.color)
        setIconUrl('')
      } else {
        setIcon(storedIcon)
        setPresetKey(null)
        setPresetColor(undefined)
        setIconUrl(storedIcon)
      }
      setError(null)
      setIconError(null)
    }
  }, [open, category])

  const clearIcon = () => {
    setIcon('')
    setIconUrl('')
    setPresetKey(null)
    setPresetColor(undefined)
    setIconError(null)
  }

  const selectPreset = (key: CategoryIconPresetKey) => {
    setPresetKey(key)
    setIcon(formatCategoryIcon(key, presetColor))
    setIconUrl('')
    setIconError(null)
  }

  const selectColor = (color: CategoryIconColorKey | undefined) => {
    if (!presetKey) return
    setPresetColor(color)
    setIcon(formatCategoryIcon(presetKey, color))
    setIconError(null)
  }

  const handleIconUrlChange = (value: string) => {
    setIconUrl(value)
    setIcon(value)
    setPresetKey(null)
    setPresetColor(undefined)
    setIconError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIconError(null)
    const trimmed = name.trim()
    const trimmedIcon = icon.trim()
    const normalizedIcon = normalizeCategoryIcon(trimmedIcon)
    let invalid = false
    if (!trimmed) {
      setError('分类名称不能为空')
      invalid = true
    } else if (trimmed.length > 50) {
      setError('分类名称不能超过 50 字符')
      invalid = true
    }
    if (trimmedIcon && normalizedIcon === undefined) {
      setIconError('图标需为预置图标、http(s) 或 data:image 链接')
      invalid = true
    }
    if (invalid) return
    setSubmitting(true)
    try {
      await onSubmit(trimmed, normalizedIcon ?? '')
      onCancel()
    } catch (err) {
      setError(describeStorageError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        className="sm:max-w-sm"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          nameInputRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-h1">{isEdit ? '编辑分类' : '新建分类'}</DialogTitle>
          <DialogDescription className="sr-only">
            输入分类名称与可选图标，名称在分类列表中必须唯一。
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            void handleSubmit(e)
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="category-name">分类名称</Label>
            <Input
              id="category-name"
              type="text"
              placeholder="如：工作、学习、娱乐"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
              maxLength={50}
              ref={nameInputRef}
              aria-invalid={!!error}
              aria-required="true"
              aria-describedby={error ? 'category-error' : undefined}
            />
            {error && (
              <p id="category-error" role="alert" className="text-caption text-destructive">
                {error}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium leading-none">图标（可选）</span>
              {icon.trim() && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 px-2 sm:h-7"
                  onClick={clearIcon}
                >
                  清除
                </Button>
              )}
            </div>
            <div
              className="grid grid-cols-5 gap-1.5 min-[360px]:grid-cols-6 sm:grid-cols-8"
              role="group"
              aria-label="预置图标"
            >
              {CATEGORY_ICON_PRESETS.map(({ key, label }) => {
                const PresetIcon = PRESET_ICON_COMPONENTS[key]
                const selected = presetKey === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectPreset(key)}
                    aria-label={`使用图标：${label}`}
                    aria-pressed={selected}
                    title={label}
                    className={cn(
                      'focus-ring flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:h-9 sm:w-9',
                      selected && 'border-primary bg-accent text-accent-foreground',
                    )}
                  >
                    <PresetIcon aria-hidden="true" className="h-5 w-5 sm:h-4 sm:w-4" />
                  </button>
                )
              })}
            </div>
            {presetKey && (
              <div
                className="flex flex-wrap items-center gap-2 pt-1"
                role="group"
                aria-label="图标颜色"
              >
                <span className="w-8 text-caption text-muted-foreground">颜色</span>
                <button
                  type="button"
                  onClick={() => selectColor(undefined)}
                  aria-label="颜色：跟随主题"
                  aria-pressed={!presetColor}
                  title="跟随主题"
                  className={cn(
                    'focus-ring flex h-11 w-11 items-center justify-center rounded-full sm:h-9 sm:w-9',
                    !presetColor && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
                  )}
                >
                  <span className="h-5 w-5 rounded-full border-2 border-dashed border-muted-foreground sm:h-4 sm:w-4" />
                </button>
                {CATEGORY_ICON_COLORS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectColor(key)}
                    aria-label={`颜色：${label}`}
                    aria-pressed={presetColor === key}
                    title={label}
                    className={cn(
                      'focus-ring flex h-11 w-11 items-center justify-center rounded-full sm:h-9 sm:w-9',
                      presetColor === key &&
                        'ring-2 ring-ring ring-offset-2 ring-offset-background',
                    )}
                  >
                    <span
                      className={cn(
                        'h-5 w-5 rounded-full bg-current sm:h-4 sm:w-4',
                        PRESET_ICON_COLOR_CLASSES[key],
                      )}
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-2 pt-1">
              <Label htmlFor="category-icon">图片 URL（可选）</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="category-icon"
                  type="text"
                  placeholder="https://example.com/icon.png"
                  value={iconUrl}
                  onChange={(e) => handleIconUrlChange(e.target.value)}
                  aria-invalid={!!iconError}
                  aria-describedby={iconError ? 'category-icon-error' : undefined}
                  className="flex-1"
                />
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-muted/40">
                  <CategoryIcon category={{ name, icon }} fallback="letter" className="h-5 w-5" />
                </span>
              </div>
              {iconError && (
                <p id="category-icon-error" role="alert" className="text-caption text-destructive">
                  {iconError}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '保存中…' : isEdit ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
