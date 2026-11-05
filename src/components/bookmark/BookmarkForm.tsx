/**
 * BookmarkForm 组件 - 添加/编辑书签表单
 * 添加、URL 验证、编辑、图标自动获取
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Bookmark, BookmarkFormData, Category } from '@/types'
import { validateAndNormalizeUrl } from '@/utils/url'
import { resolveIcon } from '@/services/favicon'
import { describeStorageError } from '@/utils/storage'
import { countByUrl } from '@/services/db'

/** Radix Select 不允许空字符串作为 item value,用哨兵表示“未分类” */
const UNCATEGORIZED = '__uncategorized__'

export interface BookmarkFormProps {
  open: boolean
  bookmark?: Bookmark | null
  categories: Category[]
  /** 新增时预选的分类(当前筛选的分类) */
  defaultCategoryId?: string | null
  onSubmit: (data: BookmarkFormData) => Promise<void> | void
  onCancel: () => void
}

export function BookmarkForm({
  open,
  bookmark,
  categories,
  defaultCategoryId,
  onSubmit,
  onCancel,
}: BookmarkFormProps) {
  const isEdit = !!bookmark
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [duplicateCount, setDuplicateCount] = useState(0)
  const urlInputRef = useRef<HTMLInputElement>(null)

  // 重复 URL 仅提示,不阻止保存(数据模型允许重复)
  useEffect(() => {
    let cancelled = false
    const validation = validateAndNormalizeUrl(url)
    if (!validation.valid) {
      setDuplicateCount(0)
      return
    }
    const normalized = validation.normalized!
    countByUrl(normalized)
      .then((count) => {
        if (cancelled) return
        const editingSameUrl =
          bookmark && validateAndNormalizeUrl(bookmark.url).normalized === normalized
        setDuplicateCount(Math.max(0, count - (editingSameUrl ? 1 : 0)))
      })
      .catch(() => {
        if (!cancelled) setDuplicateCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [url, bookmark])

  // 预填充（编辑模式）;新增时默认选中当前筛选分类。
  // 用 layout effect 在绘制前完成重置,避免用户/自动化刚输入就被预填充覆盖。
  useLayoutEffect(() => {
    if (open) {
      setUrl(bookmark?.url ?? '')
      setName(bookmark?.name ?? '')
      setIcon(bookmark?.icon ?? '')
      setCategoryId(bookmark?.categoryId ?? defaultCategoryId ?? '')
      setUrlError(null)
      setNameError(null)
      setFormError(null)
    }
  }, [open, bookmark, defaultCategoryId])

  const validateUrl = (value: string): boolean => {
    const result = validateAndNormalizeUrl(value)
    if (!result.valid) {
      setUrlError(result.error ?? 'URL 无效')
      return false
    }
    setUrlError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameError(null)
    setFormError(null)
    if (!name.trim()) {
      setNameError('名称不能为空')
      return
    }
    if (!validateUrl(url)) return
    setSubmitting(true)
    try {
      const validation = validateAndNormalizeUrl(url)
      const data: BookmarkFormData = {
        url: validation.normalized!,
        name: name.trim(),
        icon: icon.trim() || undefined,
        categoryId: categoryId || null,
      }
      await onSubmit(data)
      onCancel()
    } catch (err) {
      // 保存失败时保留表单与输入,错误展示在表单内
      setFormError(describeStorageError(err))
    } finally {
      setSubmitting(false)
    }
  }

  // 预览图标：未填写时自动解析
  const previewIcon = icon.trim() || resolveIcon(url, name)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        className="sm:max-w-md"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          urlInputRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-h1">{isEdit ? '编辑书签' : '添加书签'}</DialogTitle>
          <DialogDescription className="sr-only">
            填写 URL、名称与可选分类，保存后书签会出现在列表中。
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            void handleSubmit(e)
          }}
          className="space-y-4"
        >
          {formError && (
            <p
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-caption text-destructive"
            >
              {formError}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="bookmark-url">URL</Label>
            <Input
              id="bookmark-url"
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                if (urlError) validateUrl(e.target.value)
              }}
              onBlur={(e) => validateUrl(e.target.value)}
              aria-invalid={!!urlError}
              aria-required="true"
              aria-describedby={
                [urlError ? 'url-error' : null, duplicateCount > 0 ? 'url-duplicate' : null]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              ref={urlInputRef}
            />
            {urlError && (
              <p id="url-error" role="alert" className="text-caption text-destructive">
                {urlError}
              </p>
            )}
            {duplicateCount > 0 && (
              <p id="url-duplicate" className="text-caption text-warning">
                已存在 {duplicateCount} 个相同 URL 的书签，仍可保存。
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookmark-name">名称</Label>
            <Input
              id="bookmark-name"
              type="text"
              placeholder="书签名称"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (nameError) setNameError(null)
                if (formError) setFormError(null)
              }}
              maxLength={100}
              aria-invalid={!!nameError}
              aria-required="true"
              aria-describedby={nameError ? 'bookmark-name-error' : undefined}
            />
            {nameError && (
              <p id="bookmark-name-error" role="alert" className="text-caption text-destructive">
                {nameError}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookmark-icon">图标 URL（可选，留空自动获取）</Label>
            <div className="flex items-center gap-2">
              <Input
                id="bookmark-icon"
                type="text"
                placeholder="自动获取"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="flex-1"
              />
              <img
                src={previewIcon}
                alt="图标预览"
                referrerPolicy="no-referrer"
                className="h-8 w-8 shrink-0 rounded"
                onError={(e) => {
                  e.currentTarget.style.visibility = 'hidden'
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookmark-category">分类（可选）</Label>
            <Select
              value={categoryId || UNCATEGORIZED}
              onValueChange={(value) => setCategoryId(value === UNCATEGORIZED ? '' : value)}
            >
              <SelectTrigger id="bookmark-category" className="text-body" aria-label="分类（可选）">
                <SelectValue placeholder="未分类" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                <SelectItem value={UNCATEGORIZED}>未分类</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '保存中…' : isEdit ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
