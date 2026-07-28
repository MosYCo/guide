import { test, expect, type Page } from '@playwright/test'

/**
 * US5 E2E: 数据持久化
 * SC-003: 关闭浏览器后重新打开，书签数据保留（持久化边界内）
 */

async function addBookmark(page: Page, url: string, name: string) {
  await page.click('button:has-text("添加书签")')
  await page.waitForSelector('[role="dialog"]')
  await page.fill('[placeholder="https://example.com"]', url)
  await page.fill('[placeholder="书签名称"]', name)
  await page.locator('[role="dialog"] button[type="submit"]').click()
  await page.waitForSelector('[role="dialog"]', { state: 'detached' })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('bookmark-navigation')
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    })
  })
  await page.goto('/')
  await page.waitForSelector('text=书签导航')
})

test('添加书签后刷新页面，数据保留', async ({ page }) => {
  await addBookmark(page, 'https://persisted.com', 'Persisted')
  await expect(page.getByRole('button', { name: '打开书签：Persisted' })).toBeVisible()

  await page.reload()
  await page.waitForSelector('text=书签导航')
  await expect(page.getByRole('button', { name: '打开书签：Persisted' })).toBeVisible()
})

test('添加多个书签后刷新，全部保留', async ({ page }) => {
  await addBookmark(page, 'https://a.com', 'Site A')
  await addBookmark(page, 'https://b.com', 'Site B')
  await addBookmark(page, 'https://c.com', 'Site C')

  await page.reload()
  await page.waitForSelector('text=书签导航')

  await expect(page.getByRole('button', { name: '打开书签：Site A' })).toBeVisible()
  await expect(page.getByRole('button', { name: '打开书签：Site B' })).toBeVisible()
  await expect(page.getByRole('button', { name: '打开书签：Site C' })).toBeVisible()
})
