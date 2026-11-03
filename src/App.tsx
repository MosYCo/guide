/**
 * App 根组件 - 阶段 4: US2 分类组织 + US4 编辑删除
 * T014: 搜索改为命令面板(FR-008),内联过滤移除
 */

import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Header } from '@/components/layout/Header'
import { AppLayout } from '@/components/layout/AppLayout'
import { BookmarkForm } from '@/components/bookmark/BookmarkForm'
import { BookmarkGrid, WelcomeState } from '@/components/bookmark/BookmarkGrid'
import { CategoryNav } from '@/components/category/CategoryNav'
import { CategoryForm } from '@/components/category/CategoryForm'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { useTheme } from '@/hooks/useTheme'
import { useBookmarks } from '@/hooks/useBookmarks'
import { useCategories } from '@/hooks/useCategories'
import { requestPersistentStorage, detectIncognito } from '@/utils/storage'
import type { Bookmark, BookmarkFormData, Category } from '@/types'

// T017: 命令面板懒加载,减小首屏 JS(FR-019)
const CommandPalette = lazy(() =>
  import('@/components/bookmark/CommandPalette').then((m) => ({
    default: m.CommandPalette,
  })),
)

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  )
}

function AppInner() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { toast } = useToast()
  const {
    bookmarks,
    loading,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    getRecentBookmarks,
    recordVisit,
    moveBookmarkToCategory,
    refresh: refreshBookmarks,
  } = useBookmarks()
  const {
    categories,
    addCategory,
    renameCategory,
    deleteCategory,
    reorderCategories,
    refresh: refreshCategories,
  } = useCategories()

  // 导入等跨数据源操作后,书签与分类必须同时失效。
  // silent:不切换 loading,避免把正在关闭的弹层提前卸载(Radix 滚动锁会残留)。
  const refreshAll = useCallback(async () => {
    const [bookmarksOk, categoriesOk] = await Promise.all([
      refreshBookmarks({ silent: true }),
      refreshCategories({ silent: true }),
    ])
    if (!bookmarksOk || !categoriesOk) {
      toast('数据已保存,但界面刷新失败,请重新加载', 'warning')
    }
  }, [refreshBookmarks, refreshCategories, toast])

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [bookmarkFormOpen, setBookmarkFormOpen] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [draggingBookmark, setDraggingBookmark] = useState<Bookmark | null>(null)
  const [incognitoWarn, setIncognitoWarn] = useState(false)
  // T014: 命令面板开关(搜索由面板承载,查询状态面板内部管理)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  // 折叠态上提至 App:AppLayout 据此切 aside 宽度,CategoryNav 受控
  const [navCollapsed, setNavCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('category-nav-collapsed') === 'true'
  })
  useEffect(() => {
    localStorage.setItem('category-nav-collapsed', String(navCollapsed))
  }, [navCollapsed])

  useEffect(() => {
    requestPersistentStorage()
    if (detectIncognito()) setIncognitoWarn(true)
  }, [])

  // Ctrl+K 全局快捷键打开命令面板(FR-008);Ctrl+N 新建书签
  useHotkeys(
    'ctrl+n, meta+n',
    (e) => {
      e.preventDefault()
      setEditingBookmark(null)
      setBookmarkFormOpen(true)
    },
    { enableOnFormTags: false },
  )
  useHotkeys(
    'ctrl+k, meta+k',
    (e) => {
      e.preventDefault()
      setCommandPaletteOpen(true)
    },
    { enableOnFormTags: false },
  )

  // 分类筛选(命令面板的查询结果独立,这里仅按分类过滤)
  const filteredBookmarks = useMemo(() => {
    if (selectedCategoryId === null) return bookmarks
    return bookmarks.filter((b) => b.categoryId === selectedCategoryId)
  }, [bookmarks, selectedCategoryId])

  // 各分类书签计数
  const bookmarkCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const b of bookmarks) {
      if (b.categoryId) counts[b.categoryId] = (counts[b.categoryId] ?? 0) + 1
    }
    return counts
  }, [bookmarks])

  const recentBookmarks = useMemo(
    () => (selectedCategoryId !== null ? [] : getRecentBookmarks(10)),
    [selectedCategoryId, getRecentBookmarks],
  )

  const handleAddBookmark = useCallback(() => {
    setEditingBookmark(null)
    setBookmarkFormOpen(true)
  }, [])

  const handleAddCategory = useCallback(() => {
    setEditingCategory(null)
    setCategoryFormOpen(true)
  }, [])

  const handleEditCategory = useCallback((c: Category) => {
    setEditingCategory(c)
    setCategoryFormOpen(true)
  }, [])

  const handleDeleteCategory = useCallback(
    async (id: string) => {
      try {
        await deleteCategory(id)
        // DB 级联已把书签 categoryId 置空,内存副本也必须重载,
        // 否则编辑旧书签会把已删除的分类 ID 写回。
        const refreshed = await refreshBookmarks({ silent: true })
        setSelectedCategoryId((prev) => (prev === id ? null : prev))
        if (refreshed) toast('分类已删除')
        else toast('分类已删除,但书签列表刷新失败,请重新加载', 'warning')
      } catch (e) {
        toast(e instanceof Error ? e.message : '删除失败', 'error')
      }
    },
    [deleteCategory, refreshBookmarks, toast],
  )

  const handleBookmarkSubmit = useCallback(
    async (data: BookmarkFormData) => {
      try {
        if (editingBookmark) {
          await updateBookmark(editingBookmark.id, data)
          toast('书签已更新')
        } else {
          await addBookmark(data)
          toast('书签已添加')
        }
      } catch (e) {
        toast(e instanceof Error ? e.message : '保存失败', 'error')
      }
    },
    [editingBookmark, addBookmark, updateBookmark, toast],
  )

  const handleCategorySubmit = useCallback(
    async (name: string) => {
      try {
        if (editingCategory) {
          await renameCategory(editingCategory.id, name)
          toast('分类已重命名')
        } else {
          await addCategory(name)
          toast('分类已创建')
        }
      } catch (e) {
        toast(e instanceof Error ? e.message : '操作失败', 'error')
      }
    },
    [editingCategory, addCategory, renameCategory, toast],
  )

  const handleDeleteBookmark = useCallback(
    async (id: string) => {
      try {
        await deleteBookmark(id)
        toast('书签已删除')
      } catch (e) {
        toast(e instanceof Error ? e.message : '删除失败', 'error')
      }
    },
    [deleteBookmark, toast],
  )

  const handleBookmarkClick = useCallback(
    (bm: Bookmark) => {
      void recordVisit(bm.id).catch(() => {
        toast('访问记录保存失败', 'warning')
      })
      window.open(bm.url, '_blank', 'noopener,noreferrer')
    },
    [recordVisit, toast],
  )

  // 拖拽书签到分类
  const handleCategoryDrop = useCallback(
    async (categoryId: string | null) => {
      if (!draggingBookmark) return
      try {
        await moveBookmarkToCategory(draggingBookmark.id, categoryId)
      } catch (e) {
        toast(e instanceof Error ? e.message : '移动失败', 'error')
      } finally {
        setDraggingBookmark(null)
      }
    },
    [draggingBookmark, moveBookmarkToCategory, toast],
  )

  // T014: 搜索改由命令面板承载,内联无搜索态;无结果态移除(网格永远显示分类过滤结果)

  return (
    <AppLayout
      collapsed={navCollapsed}
      header={
        <Header
          theme={theme}
          resolvedTheme={resolvedTheme}
          onThemeChange={setTheme}
          onAddBookmark={handleAddBookmark}
          onDataChanged={refreshAll}
          onOpenSearch={() => setCommandPaletteOpen(true)}
        />
      }
      categoryNav={
        <CategoryNav
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          bookmarkCounts={bookmarkCounts}
          totalCount={bookmarks.length}
          onSelect={setSelectedCategoryId}
          onAdd={handleAddCategory}
          onEdit={handleEditCategory}
          onDelete={handleDeleteCategory}
          onReorder={reorderCategories}
          onBookmarkDrop={handleCategoryDrop}
          collapsed={navCollapsed}
          onToggleCollapse={() => setNavCollapsed((v) => !v)}
        />
      }
    >
      {incognitoWarn && (
        <div className="mb-3 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
          当前为隐私/无痕模式，关闭窗口后数据可能丢失。
        </div>
      )}
      {loading ? (
        <BookmarkGrid
          bookmarks={[]}
          onEdit={() => {}}
          onDelete={() => {}}
          onClick={() => {}}
          loading
        />
      ) : bookmarks.length === 0 ? (
        <WelcomeState onAdd={handleAddBookmark} />
      ) : (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              if (draggingBookmark) e.preventDefault()
            }}
            onDrop={() => handleCategoryDrop(null)}
          >
            <BookmarkGrid
              bookmarks={filteredBookmarks}
              recentBookmarks={recentBookmarks}
              onEdit={(bm) => {
                setEditingBookmark(bm)
                setBookmarkFormOpen(true)
              }}
              onDelete={handleDeleteBookmark}
              onClick={handleBookmarkClick}
              onAdd={handleAddBookmark}
              onBookmarkDragStart={setDraggingBookmark}
              onBookmarkDragEnd={() => setDraggingBookmark(null)}
              resetKey={selectedCategoryId ?? 'all'}
            />
          </div>
        </div>
      )}
      <BookmarkForm
        open={bookmarkFormOpen}
        bookmark={editingBookmark}
        categories={categories}
        onSubmit={handleBookmarkSubmit}
        onCancel={() => setBookmarkFormOpen(false)}
      />
      <CategoryForm
        open={categoryFormOpen}
        category={editingCategory}
        onSubmit={handleCategorySubmit}
        onCancel={() => setCategoryFormOpen(false)}
      />
      {/* T017: 命令面板懒加载,减小首屏 JS */}
      <Suspense fallback={null}>
        <CommandPalette
          open={commandPaletteOpen}
          bookmarks={bookmarks}
          onSelect={handleBookmarkClick}
          onClose={() => setCommandPaletteOpen(false)}
          onCreate={handleAddBookmark}
        />
      </Suspense>
    </AppLayout>
  )
}
