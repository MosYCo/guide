import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import type { Bookmark } from '../types'

interface KeyboardOptions {
  query: Ref<string>
  activeCategory: Ref<string | null>
  categories: Ref<string[]>
  bookmarks: Ref<Bookmark[]>
  modalOpen: Ref<boolean>
  helpOpen: Ref<boolean>
  onAdd: () => void
  onClearCategory: () => void
  onSelectCategory: (category: string | null) => void
  onCloseModal: () => void
  onCloseHelp: () => void
  onOpenHelp: () => void
  onCycleTheme: () => void
  onEdit: (bookmark: Bookmark) => void
  onDelete: (bookmark: Bookmark) => void
  onTogglePin: (bookmark: Bookmark) => void
  onMoveDock: (bookmark: Bookmark, direction: 'left' | 'right') => void
}

const getGridColumnCount = () => {
  const grid = document.querySelector<HTMLElement>('.cat-grid')
  if (!grid) return 1

  const columns = window.getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean)
  return Math.max(columns.length, 1)
}

const scrollBookmarkIntoView = (id: string) => {
  const card = document.querySelector<HTMLAnchorElement>(`.bk[data-bookmark-id="${CSS.escape(id)}"]`)
  card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

export const useBookmarkKeyboard = (options: KeyboardOptions) => {
  const focusedId = ref<string | null>(null)

  const syncFocusedCard = (index: number) => {
    const bookmarks = options.bookmarks.value
    if (!bookmarks.length) {
      focusedId.value = null
      return
    }

    const nextIndex = Math.max(0, Math.min(index, bookmarks.length - 1))
    focusedId.value = bookmarks[nextIndex].id
    scrollBookmarkIntoView(bookmarks[nextIndex].id)
  }

  const moveFocus = (delta: number) => {
    const bookmarks = options.bookmarks.value
    if (!bookmarks.length) return

    const currentIndex = bookmarks.findIndex((bookmark) => bookmark.id === focusedId.value)
    syncFocusedCard(currentIndex === -1 ? 0 : currentIndex + delta)
  }

  const openFocused = () => {
    const bookmark = options.bookmarks.value.find((item) => item.id === focusedId.value)
    if (bookmark) {
      window.open(bookmark.url, '_blank', 'noopener')
    }
  }

  const getFocusedBookmark = () => {
    return options.bookmarks.value.find((item) => item.id === focusedId.value)
  }

  const clearFocus = () => {
    focusedId.value = null
  }

  watch(
    () => options.bookmarks.value.map((bookmark) => bookmark.id),
    (ids) => {
      if (focusedId.value && !ids.includes(focusedId.value)) {
        clearFocus()
      }
    },
  )

  const handleKeydown = (event: KeyboardEvent) => {
    const searchInput = document.getElementById('bookmark-search') as HTMLInputElement | null
    const isSearchFocused = document.activeElement === searchInput

    if (event.key === '?' && !options.modalOpen.value && !options.helpOpen.value) {
      event.preventDefault()
      options.onOpenHelp()
      return
    }

    if (event.key === 'Escape') {
      if (options.helpOpen.value) {
        options.onCloseHelp()
        return
      }
      if (options.modalOpen.value) {
        options.onCloseModal()
        return
      }
      if (options.query.value) {
        options.query.value = ''
        options.onClearCategory()
        searchInput?.blur()
        clearFocus()
        return
      }
      if (options.activeCategory.value !== null) {
        options.onClearCategory()
        clearFocus()
      }
      return
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n' && !options.modalOpen.value) {
      event.preventDefault()
      options.onAdd()
      return
    }

    if (
      event.key.toLowerCase() === 't' &&
      !options.modalOpen.value &&
      !options.helpOpen.value &&
      !isSearchFocused &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault()
      options.onCycleTheme()
      return
    }

    if (!options.modalOpen.value && !options.helpOpen.value && !isSearchFocused) {
      const categoryIndex = Number.parseInt(event.key, 10)
      if (categoryIndex >= 1 && categoryIndex <= 9) {
        const category = options.categories.value[categoryIndex - 1]
        if (category) {
          event.preventDefault()
          options.onSelectCategory(category)
          clearFocus()
          return
        }
      }
      if (event.key === '0') {
        event.preventDefault()
        options.onSelectCategory(null)
        clearFocus()
        return
      }
    }

    if (event.key === '/' && !options.modalOpen.value && !options.helpOpen.value && !isSearchFocused) {
      event.preventDefault()
      searchInput?.focus()
      return
    }

    if (options.modalOpen.value || options.helpOpen.value) return

    const focusedBookmark = getFocusedBookmark()

    if (focusedBookmark && !isSearchFocused) {
      if (event.key.toLowerCase() === 'e') {
        event.preventDefault()
        options.onEdit(focusedBookmark)
        return
      }
      if (event.key.toLowerCase() === 'd') {
        event.preventDefault()
        options.onDelete(focusedBookmark)
        return
      }
      if (event.key.toLowerCase() === 'p') {
        event.preventDefault()
        options.onTogglePin(focusedBookmark)
        return
      }
      if (event.shiftKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        options.onMoveDock(focusedBookmark, 'left')
        return
      }
      if (event.shiftKey && event.key === 'ArrowRight') {
        event.preventDefault()
        options.onMoveDock(focusedBookmark, 'right')
        return
      }
    }

    if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) {
      event.preventDefault()
      moveFocus(1)
    }
    if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
      event.preventDefault()
      moveFocus(-1)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveFocus(getGridColumnCount())
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveFocus(-getGridColumnCount())
    }
    if (event.key === 'Enter' && focusedId.value && !isSearchFocused) {
      event.preventDefault()
      openFocused()
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeydown)
  })

  return {
    focusedId,
    clearFocus,
  }
}
