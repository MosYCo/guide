import type { Page } from '@playwright/test'

export type SeedMode = 'perf' | 'baseline'

/**
 * 在页面内 await 事务完成后 reload,避免 addInitScript 不被 Playwright await
 * 造成的“应用先读到空库”竞态。同时创建 bookmarks/categories 两个 store。
 */
export async function seedBookmarks(
  page: Page,
  count: number,
  mode: SeedMode = 'perf',
): Promise<void> {
  await page.goto('/')
  await page.evaluate(
    async ({ n, seedMode }) => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('bookmark-navigation', 1)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains('bookmarks')) {
            const store = db.createObjectStore('bookmarks', { keyPath: 'id' })
            store.createIndex('categoryId', 'categoryId')
            store.createIndex('createdAt', 'createdAt')
            store.createIndex('lastVisitedAt', 'lastVisitedAt')
            store.createIndex('url', 'url')
          }
          if (!db.objectStoreNames.contains('categories')) {
            const store = db.createObjectStore('categories', { keyPath: 'id' })
            store.createIndex('order', 'order')
            store.createIndex('name', 'name')
          }
        }
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('bookmarks', 'readwrite')
          const store = tx.objectStore('bookmarks')
          for (let i = 0; i < n; i++) {
            const baseline = seedMode === 'baseline'
            store.add({
              id: `seed-bm-${i}`,
              url: baseline ? `https://example${i % 10}.com/${i}` : `https://example${i}.com`,
              name: baseline ? `站点 ${i}` : `Site ${i}`,
              icon: baseline
                ? `https://www.google.com/s2/favicons?domain=example${i % 10}.com`
                : '',
              categoryId: null,
              createdAt: baseline
                ? new Date(2026, 0, (i % 28) + 1).toISOString()
                : new Date().toISOString(),
              lastVisitedAt: baseline && i % 3 === 0 ? new Date().toISOString() : null,
            })
          }
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        }
      })
    },
    { n: count, seedMode: mode },
  )
  await page.reload()
}
