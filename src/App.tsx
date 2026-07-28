/**
 * App 根组件 - 阶段 4: US2 分类组织 + US4 编辑删除
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Header } from '@/components/layout/Header'
import { AppLayout } from '@/components/layout/AppLayout'
import { BookmarkForm } from '@/components/bookmark/BookmarkForm'
import { BookmarkSearch } from '@/components/bookmark/BookmarkSearch'
import { BookmarkGrid, WelcomeState } from '@/components/bookmark/BookmarkGrid'
import { CategoryNav } from '@/components/category/CategoryNav'
import { CategoryForm } from '@/components/category/CategoryForm'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { useTheme } from '@/hooks/useTheme'
import { useBookmarks } from '@/hooks/useBookmarks'
import { useCategories } from '@/hooks/useCategories'
import { useSearch } from '@/hooks/useSearch'
import { requestPersistentStorage, detectIncognito } from '@/utils/storage'
import type { Bookmark, BookmarkFormData, Category } from '@/types'

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
    refresh,
  } = useBookmarks()
  const {
    categories,
    addCategory,
    renameCategory,
    deleteCategory,
    reorderCategories,
  } = useCategories()

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const { query, setQuery, results, hasQuery } = useSearch(bookmarks)
  const [bookmarkFormOpen, setBookmarkFormOpen] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [draggingBookmark, setDraggingBookmark] = useState<Bookmark | null>(null)
  const [incognitoWarn, setIncognitoWarn] = useState(false)

  useEffect(() => {
    requestPersistentStorage()
    if (detectIncognito()) setIncognitoWarn(true)
  }, [])

  useHotkeys(
    'ctrl+n, meta+n',
    (e) => {
      e.preventDefault()
      setEditingBookmark(null)
      setBookmarkFormOpen(true)
    },
    { enableOnFormTags: false },
  )

  // 分类筛选
  const filteredBookmarks = useMemo(() => {
    if (hasQuery) return results
    if (selectedCategoryId === null) return bookmarks
    return bookmarks.filter((b) => b.categoryId === selectedCategoryId)
  }, [bookmarks, results, hasQuery, selectedCategoryId])

  // 各分类书签计数
  const bookmarkCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const b of bookmarks) {
      if (b.categoryId) counts[b.categoryId] = (counts[b.categoryId] ?? 0) + 1
    }
    return counts
  }, [bookmarks])

  const recentBookmarks = useMemo(
    () => (hasQuery || selectedCategoryId !== null ? [] : getRecentBookmarks(10)),
    [hasQuery, selectedCategoryId, getRecentBookmarks, bookmarks],
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
        if (selectedCategoryId === id) setSelectedCategoryId(null)
        toast('分类已删除')
      } catch (e) {
        toast(e instanceof Error ? e.message : '删除失败', 'error')
      }
    },
    [deleteCategory, selectedCategoryId, toast],
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
      recordVisit(bm.id)
      window.open(bm.url, '_blank', 'noopener,noreferrer')
    },
    [recordVisit],
  )

  // 拖拽书签到分类
  const handleCategoryDrop = useCallback(
    async (categoryId: string | null) => {
      if (!draggingBookmark) return
      await moveBookmarkToCategory(draggingBookmark.id, categoryId)
      setDraggingBookmark(null)
    },
    [draggingBookmark, moveBookmarkToCategory],
  )

  const searchNoResult = hasQuery && results.length === 0 && bookmarks.length > 0

  return (
    <AppLayout
      header={
        <Header
          theme={theme}
          resolvedTheme={resolvedTheme}
          onThemeChange={setTheme}
          onAddBookmark={handleAddBookmark}
          onDataChanged={refresh}
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
        />
      }
    >
      {incognitoWarn && (
        <div className="mb-3 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
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
          <BookmarkSearch query={query} onQueryChange={setQuery} />
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
              searchNoResult={searchNoResult}
              onClearSearch={() => setQuery('')}
              onBookmarkDragStart={setDraggingBookmark}
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
    </AppLayout>
  )
}
