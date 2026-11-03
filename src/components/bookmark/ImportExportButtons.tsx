/**
 * 导入预览对话框 + 导入导出按钮集成到 Header
 * FR-015 导出、FR-016/FR-018 导入（JSON + HTML）
 */

import { useCallback, useRef, useState } from 'react'
import { Download, Upload, FileWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  exportToJson,
  downloadJson,
  parseJsonFile,
  importFromJson,
  parseHtmlFile,
  importFromHtml,
} from '@/services/import-export'
import type { ImportPreview } from '@/types'

export interface ImportExportButtonsProps {
  onDataChanged: () => Promise<void> | void
}

export function ImportExportButtons({ onDataChanged }: ImportExportButtonsProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<{
    open: boolean
    data?: ImportPreview
    importFn?: () => Promise<{ success: boolean; bookmarkCount: number; error?: string }>
    error?: string
  }>({ open: false })

  const handleExport = useCallback(async () => {
    try {
      const data = await exportToJson()
      downloadJson(data)
      toast(`已导出 ${data.bookmarkCount} 个书签、${data.categoryCount} 个分类`)
    } catch (e) {
      toast(e instanceof Error ? e.message : '导出失败', 'error')
    }
  }, [toast])

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      e.target.value = '' // 允许重复选择同一文件

      try {
        if (file.name.endsWith('.json')) {
          const { preview: p, data } = await parseJsonFile(file)
          setPreview({
            open: true,
            data: p,
            importFn: async () => {
              const result = await importFromJson(data)
              await onDataChanged()
              return {
                success: result.success,
                bookmarkCount: result.bookmarkCount,
                error: result.error,
              }
            },
          })
        } else if (
          file.name.endsWith('.html') ||
          file.type.includes('html')
        ) {
          const { preview: p, categories, bookmarks } = await parseHtmlFile(file)
          setPreview({
            open: true,
            data: p,
            importFn: async () => {
              const result = await importFromHtml(categories, bookmarks)
              await onDataChanged()
              return {
                success: result.success,
                bookmarkCount: result.bookmarkCount,
                error: result.error,
              }
            },
          })
        } else {
          setPreview({
            open: true,
            error: '不支持的文件格式，请选择 .json 或 .html 文件',
          })
        }
      } catch (err) {
        setPreview({
          open: true,
          error: err instanceof Error ? err.message : '文件解析失败',
        })
      }
    },
    [onDataChanged],
  )

  const handleConfirmImport = useCallback(async () => {
    if (!preview.importFn || importing) return
    setImporting(true)
    try {
      const result = await preview.importFn()
      if (!result.success) {
        setPreview({
          open: true,
          error: result.error ?? '导入失败',
        })
      } else {
        setPreview({ open: false })
        toast(`已导入 ${result.bookmarkCount} 个书签`)
      }
    } catch (e) {
      setPreview({
        open: true,
        error: e instanceof Error ? e.message : '导入失败',
      })
    } finally {
      setImporting(false)
    }
  }, [importing, preview, toast])

  return (
    <>
      <Button variant="ghost" size="sm" onClick={handleExport} className="focus-ring min-h-11 gap-1">
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">导出</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        className="focus-ring min-h-11 gap-1"
      >
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">导入</span>
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.html,text/html,application/json"
        className="hidden"
        onChange={handleFileSelect}
        aria-label="选择导入文件"
      />

      <Dialog
        open={preview.open}
        onOpenChange={(o) => {
          // 导入一旦开始就不可取消,避免用户以为关闭即放弃、实际仍写入
          if (!o && !importing) setPreview({ open: false })
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>导入预览</DialogTitle>
            <DialogDescription>
              {preview.error
                ? '导入失败，原数据保持不变'
                : '请确认以下数据将被导入'}
            </DialogDescription>
          </DialogHeader>
          {preview.error ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <FileWarning className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{preview.error}</span>
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              <p>书签数量：{preview.data?.bookmarks ?? 0}</p>
              <p>分类数量：{preview.data?.categories ?? 0}</p>
              {preview.data && preview.data.skipped > 0 && (
                <p className="text-muted-foreground">
                  已跳过 {preview.data.skipped} 条（非 http/https）
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            {!preview.error && (
              <Button onClick={handleConfirmImport} disabled={importing}>
                {importing ? '导入中…' : '确认导入'}
              </Button>
            )}
            <Button
              variant="outline"
              disabled={importing}
              onClick={() => setPreview({ open: false })}
            >
              {preview.error ? '关闭' : importing ? '导入中…' : '取消'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
