import { test, expect, type Page } from '@playwright/test'

/**
 * T032: 极端字段 E2E
 * SC-006: 超长标题/favicon 失效/无效 URL 不破布局
 * FR-016/018
 */

async function injectExtremeBookmarks(page: Page) {
  await page.addInitScript(() => {
    return new Promise<void>((resolve) => {
      indexedDB.deleteDatabase('bookmark-navigation')
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
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('bookmarks', 'readwrite')
        const store = tx.objectStore('bookmarks')
        // 超长标题
        store.add({
          id: 'ext-long-title',
          url: 'https://example.com',
          name: '超长标题'.repeat(20),
          icon: 'https://example.com/favicon.ico',
          categoryId: null,
          createdAt: new Date().toISOString(),
          lastVisitedAt: null,
        })
        // favicon 失效
        store.add({
          id: 'ext-bad-favicon',
          url: 'https://example.org',
          name: '失效图标站',
          icon: 'https://invalid.example.invalid/favicon.ico',
          categoryId: null,
          createdAt: new Date().toISOString(),
          lastVisitedAt: null,
        })
        // 无效 URL
        store.add({
          id: 'ext-bad-url',
          url: 'not-a-valid-url',
          name: '无效URL',
          icon: '',
          categoryId: null,
          createdAt: new Date().toISOString(),
          lastVisitedAt: null,
        })
        tx.oncomplete = () => resolve()
      }
    })
  })
}

async function checkNoOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth
  })
}

test.describe('极端字段 SC-006', () => {
  test('emoji 名称不会导致白屏', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('text=书签导航')
    await page.getByRole('button', { name: '添加书签' }).first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // URL 为空时预览图标走首字母降级;emoji 曾在这里触发 URIError
    await dialog.locator('[placeholder="书签名称"]').fill('🔖 书签')

    await expect(dialog).toBeVisible()
    await expect(page.locator('#root')).not.toBeEmpty()
  })

  test('超长标题 line-clamp 不破布局', async ({ page }) => {
    await injectExtremeBookmarks(page)
    await page.goto('/')
    await page.waitForSelector('text=全部书签')

    const card = page.getByRole('button', { name: /打开书签：超长标题/ })
    await expect(card).toBeVisible()

    // 超长标题应被 line-clamp-1 截断(标题元素保留 title 全文)
    const title = card.locator('p.line-clamp-1').first()
    await expect(title).toHaveAttribute('title', /超长标题/)

    // 卡片内的 <p> 应有 line-clamp
    const clamped = await card.evaluate((el) => {
      const p = el.querySelector('p.line-clamp-1')
      return p !== null
    })
    expect(clamped).toBe(true)

    // 不破布局:无横向溢出
    expect(await checkNoOverflow(page)).toBe(true)
  })

  test('favicon 失效降级为首字母图标', async ({ page }) => {
    await injectExtremeBookmarks(page)
    await page.goto('/')
    await page.waitForSelector('text=全部书签')

    const card = page.getByRole('button', { name: '打开书签：失效图标站' })
    await expect(card).toBeVisible()

    // favicon <img> onError 后应降级(首字母图标是 SVG data URI)。
    // onError 是异步 setState,用会轮询的断言避免读到降级前的 src。
    await expect(card.locator('img')).toHaveAttribute('src', /^data:image\/svg\+xml/)
  })

  test('无效 URL 不破布局', async ({ page }) => {
    await injectExtremeBookmarks(page)
    await page.goto('/')
    await page.waitForSelector('text=全部书签')

    const card = page.getByRole('button', { name: '打开书签：无效URL' })
    await expect(card).toBeVisible()
    // 无效 URL 仍渲染,不破布局
    expect(await checkNoOverflow(page)).toBe(true)
  })
})
