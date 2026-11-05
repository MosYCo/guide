/**
 * App 根组件 - 阶段 4:  分类组织 +  编辑删除
 * 搜索改为命令面板,内联过滤移除
 */

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Header } from '@/components/layout/Header'
import { AppLayout } from '@/components/layout/AppLayout'
import { BookmarkForm } from '@/components/bookmark/BookmarkForm'
import { BookmarkGrid, WelcomeState } from '@/components/bookmark/BookmarkGrid'
import { StateError } from '@/components/ui/state-feedback'
import { CategoryNav } from '@/components/category/CategoryNav'
import { CategoryForm } from '@/components/category/CategoryForm'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { useTheme } from '@/hooks/useTheme'
import { useBookmarks } from '@/hooks/useBookmarks'
import { useCategories } from '@/hooks/useCategories'
import {
  requestPersistentStorage,
  detectIncognito,
  safeGetItem,
  safeSetItem,
} from '@/utils/storage'
import type { Bookmark, BookmarkDropPosition, BookmarkFormData, Category } from '@/types'
import { MAX_PINNED_BOOKMARKS } from '@/services/db'

// 命令面板懒加载,减小首屏 JS
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
    error: bookmarksError,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    getRecentBookmarks,
    recordVisit,
    moveBookmarkToCategory,
    toggleBookmarkPin,
    reorderBookmark,
    refresh: refreshBookmarks,
  } = useBookmarks()
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    addCategory,
    renameCategory,
    deleteCategory,
    reorderCategories,
    refresh: refreshCategories,
  } = useCategories()

  // 导入等跨数据源操作后,书签与分类必须同时失效。
  // silent:不切换主内容区骨架,避免后台刷新卸载正在交互的卡片/弹层并造成闪烁。
  const refreshAll = useCallback(async () => {
    const [bookmarksOk, categoriesOk] = await Promise.all([
      refreshBookmarks({ silent: true }),
      refreshCategories({ silent: true }),
    ])
    if (!bookmarksOk || !categoriesOk) {
      toast('数据已保存,但界面刷新失败,请重新加载', 'warning')
    }
    return bookmarksOk && categoriesOk
  }, [refreshBookmarks, refreshCategories, toast])

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [bookmarkFormOpen, setBookmarkFormOpen] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [draggingBookmark, setDraggingBookmark] = useState<Bookmark | null>(null)
  const [incognitoWarn, setIncognitoWarn] = useState(false)
  const syncChannelRef = useRef<BroadcastChannel | null>(null)
  // 命令面板开关(搜索由面板承载,查询状态面板内部管理)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  // 折叠态上提至 App:AppLayout 据此切 aside 宽度,CategoryNav 受控
  const [navCollapsed, setNavCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return safeGetItem('category-nav-collapsed') === 'true'
  })
  useEffect(() => {
    safeSetItem('category-nav-collapsed', String(navCollapsed))
  }, [navCollapsed])

  // 多标签同步:其他标签写入后静默刷新;从后台回到前台时也对账一次
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel('moss-guide-data')
    syncChannelRef.current = channel
    const refresh = () => {
      void refreshBookmarks({ silent: true })
      void refreshCategories({ silent: true })
    }
    channel.onmessage = refresh
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      channel.close()
      syncChannelRef.current = null
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refreshBookmarks, refreshCategories])

  const notifyChange = useCallback(() => {
    syncChannelRef.current?.postMessage({ type: 'refresh' })
  }, [])

  const refreshAfterImport = useCallback(async () => {
    const ok = await refreshAll()
    notifyChange()
    return ok
  }, [refreshAll, notifyChange])

  useEffect(() => {
    requestPersistentStorage()
      .then((ok) => {
        if (!ok) {
          toast('无法确认书签已受持久化存储保护，建议定期导出备份', 'warning')
        }
      })
      .catch(() => {
        /* 存储 API 不可用时静默降级 */
      })
    if (detectIncognito()) setIncognitoWarn(true)
  }, [toast])

  // Ctrl+K 全局快捷键打开命令面板;Ctrl+N 新建书签
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

  const pinnedBookmarks = useMemo(
    () =>
      selectedCategoryId === null
        ? bookmarks
            .filter((bookmark) => bookmark.pinnedAt)
            .sort(
              (a, b) =>
                (a.pinnedAt ?? '').localeCompare(b.pinnedAt ?? '') || a.id.localeCompare(b.id),
            )
            .slice(0, MAX_PINNED_BOOKMARKS)
        : [],
    [bookmarks, selectedCategoryId],
  )
  const recentBookmarks = useMemo(
    () =>
      selectedCategoryId !== null
        ? []
        : getRecentBookmarks(bookmarks.length)
            .filter((bookmark) => !bookmark.pinnedAt)
            .slice(0, 10),
    [selectedCategoryId, getRecentBookmarks, bookmarks.length],
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
        notifyChange()
        if (refreshed) toast('分类已删除')
        else toast('分类已删除,但书签列表刷新失败,请重新加载', 'warning')
      } catch (e) {
        toast(e instanceof Error ? e.message : '删除失败', 'error')
      }
    },
    [deleteCategory, refreshBookmarks, notifyChange, toast],
  )

  const handleBookmarkSubmit = useCallback(
    async (data: BookmarkFormData) => {
      // 失败时向上抛给表单,由表单保留输入并就地展示错误
      if (editingBookmark) {
        const saved = await updateBookmark(editingBookmark.id, data)
        if (data.categoryId && saved.categoryId === null) {
          toast('原分类已不存在，书签已移至未分类', 'warning')
        } else {
          toast('书签已更新')
        }
      } else {
        await addBookmark(data)
        toast('书签已添加')
      }
      notifyChange()
    },
    [editingBookmark, addBookmark, updateBookmark, notifyChange, toast],
  )

  const handleCategorySubmit = useCallback(
    async (name: string) => {
      if (editingCategory) {
        await renameCategory(editingCategory.id, name)
        toast('分类已重命名')
      } else {
        await addCategory(name)
        toast('分类已创建')
      }
      notifyChange()
    },
    [editingCategory, addCategory, renameCategory, notifyChange, toast],
  )

  const handleDeleteBookmark = useCallback(
    async (id: string) => {
      try {
        await deleteBookmark(id)
        notifyChange()
        toast('书签已删除')
      } catch (e) {
        toast(e instanceof Error ? e.message : '删除失败', 'error')
      }
    },
    [deleteBookmark, notifyChange, toast],
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

  const handleBookmarkPin = useCallback(
    async (bookmark: Bookmark) => {
      const pinned = !bookmark.pinnedAt
      try {
        await toggleBookmarkPin(bookmark.id, pinned)
        notifyChange()
        toast(pinned ? '已置顶书签' : '已取消置顶')
      } catch (e) {
        toast(e instanceof Error ? e.message : '置顶操作失败', 'warning')
      }
    },
    [toggleBookmarkPin, notifyChange, toast],
  )

  const handleBookmarkMove = useCallback(
    async (bookmark: Bookmark, categoryId: string | null) => {
      try {
        await moveBookmarkToCategory(bookmark.id, categoryId)
        notifyChange()
        toast(categoryId ? '已移动到分类' : '已移至未分类')
      } catch (e) {
        toast(e instanceof Error ? e.message : '移动失败', 'error')
      }
    },
    [moveBookmarkToCategory, notifyChange, toast],
  )

  // 拖拽/菜单调整主列表顺序
  const handleBookmarkReorder = useCallback(
    async (id: string, targetId: string, position: BookmarkDropPosition) => {
      try {
        await reorderBookmark(id, targetId, position)
        notifyChange()
      } catch (e) {
        toast(e instanceof Error ? e.message : '排序失败', 'error')
      }
    },
    [reorderBookmark, notifyChange, toast],
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

  // 搜索改由命令面板承载,内联无搜索态;无结果态移除(网格永远显示分类过滤结果)

  const isLoading = loading || categoriesLoading

  return (
    <AppLayout
      collapsed={navCollapsed}
      header={
        <Header
          theme={theme}
          resolvedTheme={resolvedTheme}
          onThemeChange={setTheme}
          onAddBookmark={handleAddBookmark}
          onDataChanged={refreshAfterImport}
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
          onDelete={(id) => {
            void handleDeleteCategory(id)
          }}
          onReorder={(ids) => {
            void reorderCategories(ids).catch((e) => {
              toast(e instanceof Error ? e.message : '分类排序失败', 'error')
            })
          }}
          onBookmarkDrop={(id) => {
            void handleCategoryDrop(id)
          }}
          collapsed={navCollapsed}
          loading={categoriesLoading}
          onToggleCollapse={() => setNavCollapsed((v) => !v)}
        />
      }
    >
      <p className="sr-only" role="status" aria-live="polite">
        {isLoading
          ? '正在加载数据'
          : `已加载 ${bookmarks.length} 个书签，${categories.length} 个分类`}
      </p>
      <div aria-busy={isLoading}>
        {incognitoWarn && (
          <div
            role="status"
            className="mb-3 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm text-warning"
          >
            当前可能为隐私/无痕模式，关闭窗口后数据可能丢失。建议定期导出备份。
          </div>
        )}
        {categoriesError && (
          <div
            role="alert"
            className="mb-3 flex items-center justify-between gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <span>分类加载失败：{categoriesError.message}</span>
            <button
              type="button"
              onClick={() => void refreshCategories()}
              className="focus-ring shrink-0 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground hover:bg-accent"
            >
              重试
            </button>
          </div>
        )}
        {bookmarksError ? (
          <StateError
            message={`加载书签失败：${bookmarksError.message}`}
            onRetry={() => void refreshBookmarks()}
          />
        ) : loading ? (
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
              onDrop={() => {
                void handleCategoryDrop(null)
              }}
            >
              <BookmarkGrid
                bookmarks={filteredBookmarks}
                pinnedBookmarks={selectedCategoryId === null ? pinnedBookmarks : undefined}
                recentBookmarks={recentBookmarks}
                onTogglePin={(bookmark) => {
                  void handleBookmarkPin(bookmark)
                }}
                onEdit={(bm) => {
                  setEditingBookmark(bm)
                  setBookmarkFormOpen(true)
                }}
                onDelete={(id) => {
                  void handleDeleteBookmark(id)
                }}
                onClick={handleBookmarkClick}
                onAdd={handleAddBookmark}
                onBookmarkDragStart={setDraggingBookmark}
                onBookmarkDragEnd={() => setDraggingBookmark(null)}
                onReorderBookmark={(id, targetId, position) => {
                  void handleBookmarkReorder(id, targetId, position)
                }}
                categories={categories}
                onMoveToCategory={(bookmark, categoryId) => {
                  void handleBookmarkMove(bookmark, categoryId)
                }}
                resetKey={selectedCategoryId ?? 'all'}
                emptyMessage={selectedCategoryId ? '该分类下暂无书签' : '暂无书签'}
              />
            </div>
          </div>
        )}
        <BookmarkForm
          open={bookmarkFormOpen}
          bookmark={editingBookmark}
          categories={categories}
          defaultCategoryId={selectedCategoryId}
          onSubmit={handleBookmarkSubmit}
          onCancel={() => setBookmarkFormOpen(false)}
        />
        <CategoryForm
          open={categoryFormOpen}
          category={editingCategory}
          onSubmit={handleCategorySubmit}
          onCancel={() => setCategoryFormOpen(false)}
        />
        {/* 仅首次打开时挂载 lazy chunk,真正延迟到 Ctrl+K */}
        {commandPaletteOpen && (
          <Suspense fallback={null}>
            <CommandPalette
              open={commandPaletteOpen}
              bookmarks={bookmarks}
              onSelect={handleBookmarkClick}
              onClose={() => setCommandPaletteOpen(false)}
              onCreate={handleAddBookmark}
            />
          </Suspense>
        )}
      </div>
    </AppLayout>
  )
}
