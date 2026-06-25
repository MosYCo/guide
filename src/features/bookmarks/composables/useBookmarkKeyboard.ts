import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

interface KeyboardOptions {
  query: Ref<string>
  activeCategory: Ref<string | null>
  categories: Ref<string[]>
  modalOpen: Ref<boolean>
  helpOpen: Ref<boolean>
  onAdd: () => void
  onClearCategory: () => void
  onSelectCategory: (category: string | null) => void
  onCloseModal: () => void
  onCloseHelp: () => void
  onOpenHelp: () => void
  onCycleTheme: () => void
}

const getCards = () => [...document.querySelectorAll<HTMLAnchorElement>('.bk')]

export const useBookmarkKeyboard = (options: KeyboardOptions) => {
  const focusedId = ref<string | null>(null)

  const syncFocusedCard = (index: number) => {
    const cards = getCards()
    if (!cards.length) {
      focusedId.value = null
      return
    }

    const nextIndex = Math.max(0, Math.min(index, cards.length - 1))
    const card = cards[nextIndex]
    focusedId.value = card.dataset.bookmarkId ?? null
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const moveFocus = (delta: number) => {
    const cards = getCards()
    if (!cards.length) return

    const currentIndex = cards.findIndex((card) => card.dataset.bookmarkId === focusedId.value)
    syncFocusedCard(currentIndex === -1 ? 0 : currentIndex + delta)
  }

  const openFocused = () => {
    const card = getCards().find((item) => item.dataset.bookmarkId === focusedId.value)
    if (card?.href) {
      window.open(card.href, '_blank', 'noopener')
    }
  }

  const clearFocus = () => {
    focusedId.value = null
  }

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
      moveFocus(3)
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveFocus(-3)
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
