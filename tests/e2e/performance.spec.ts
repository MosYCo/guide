import { test, expect, type Page } from '@playwright/test'

/**
 * T057/T070: 性能验证
 * SC-004: 100 个书签 <2s 加载
 * SC-006: 搜索响应 <500ms（含输入与渲染）
 */

async function injectBookmarks(page: Page, count: number) {
  await page.addInitScript((n) => {
    return new Promise<void>((resolve) => {
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
          const cstore = db.createObjectStore('categories', { keyPath: 'id' })
          cstore.createIndex('order', 'order')
          cstore.createIndex('name', 'name')
        }
      }
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('bookmarks', 'readwrite')
        const store = tx.objectStore('bookmarks')
        for (let i = 0; i < n; i++) {
          store.add({
            id: `perf-bm-${i}`,
            url: `https://example${i}.com`,
            name: `Site ${i}`,
            icon: '',
            categoryId: null,
            createdAt: new Date().toISOString(),
            lastVisitedAt: null,
          })
        }
        tx.oncomplete = () => resolve()
      }
    })
  }, count)
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('bookmark-navigation')
  })
})

test('100 个书签页面加载 <2s', async ({ page }) => {
  await injectBookmarks(page, 100)

  const start = Date.now()
  await page.goto('/')
  await page.waitForSelector('text=Site 0')
  const elapsed = Date.now() - start
  expect(elapsed).toBeLessThan(2000)
})

test('搜索响应 <500ms', async ({ page }) => {
  await injectBookmarks(page, 100)
  await page.goto('/')
  await page.waitForSelector('text=Site 0')

  await page.keyboard.press('Control+k')
  const start = Date.now()
  await page.fill('[placeholder="搜索书签（Ctrl+K）"]', 'Site 50')
  await page.waitForSelector('text=Site 50')
  const elapsed = Date.now() - start
  expect(elapsed).toBeLessThan(500)
})
