/**
 * BookmarkForm 组件 - 添加/编辑书签表单
 * FR-001 添加、FR-002 URL 验证、FR-005 编辑、FR-008 图标自动获取
 * @see specs/001-bookmark-navigation/contracts/ui-contract.md §BookmarkForm
 */

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { Bookmark, BookmarkFormData, Category } from '@/types'
import { validateAndNormalizeUrl } from '@/utils/url'
import { resolveIcon } from '@/services/favicon'

export interface BookmarkFormProps {
  open: boolean
  bookmark?: Bookmark | null
  categories: Category[]
  onSubmit: (data: BookmarkFormData) => Promise<void> | void
  onCancel: () => void
}

export function BookmarkForm({
  open,
  bookmark,
  categories,
  onSubmit,
  onCancel,
}: BookmarkFormProps) {
  const isEdit = !!bookmark
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 预填充（编辑模式）
  useEffect(() => {
    if (open) {
      setUrl(bookmark?.url ?? '')
      setName(bookmark?.name ?? '')
      setIcon(bookmark?.icon ?? '')
      setCategoryId(bookmark?.categoryId ?? '')
      setUrlError(null)
    }
  }, [open, bookmark])

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
    if (!name.trim()) {
      setUrlError('名称不能为空')
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
      setUrlError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 预览图标：未填写时自动解析
  const previewIcon = icon.trim() || resolveIcon(url, name)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑书签' : '添加书签'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              aria-describedby={urlError ? 'url-error' : undefined}
              autoFocus
            />
            {urlError && (
              <p id="url-error" className="text-sm text-destructive">
                {urlError}
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
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookmark-icon">
              图标 URL（可选，留空自动获取）
            </Label>
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
                className="h-8 w-8 shrink-0 rounded"
                onError={(e) => {
                  e.currentTarget.style.visibility = 'hidden'
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookmark-category">分类（可选）</Label>
            <select
              id="bookmark-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">未分类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
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
