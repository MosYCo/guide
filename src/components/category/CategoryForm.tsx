/**
 * CategoryForm 组件 - 添加/重命名分类表单
 * FR-007 创建、重命名
 * @see specs/001-bookmark-navigation/contracts/ui-contract.md §CategoryForm
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
import type { Category } from '@/types'

export interface CategoryFormProps {
  open: boolean
  category?: Category | null
  onSubmit: (name: string) => Promise<void> | void
  onCancel: () => void
}

export function CategoryForm({
  open,
  category,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const isEdit = !!category
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(category?.name ?? '')
      setError(null)
    }
  }, [open, category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('分类名称不能为空')
      return
    }
    if (trimmed.length > 50) {
      setError('分类名称不能超过 50 字符')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(trimmed)
      onCancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-h1">{isEdit ? '重命名分类' : '新建分类'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoFocus
              aria-invalid={!!error}
              aria-describedby={error ? 'category-error' : undefined}
            />
            {error && (
              <p id="category-error" className="text-caption text-destructive">
                {error}
              </p>
            )}
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
              {submitting ? '保存中…' : isEdit ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
