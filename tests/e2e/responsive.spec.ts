import { test, expect, type Page } from '@playwright/test'

/**
 * 响应式布局验证（移动端 <1024px）
 */

async function addBookmark(page: Page, url: string, name: string) {
  await page.click('button:has-text("添加书签")')
  await page.waitForSelector('[role="dialog"]')
  await page.fill('[placeholder="https://example.com"]', url)
  await page.fill('[placeholder="书签名称"]', name)
  await page.locator('[role="dialog"] button[type="submit"]').click()
  await page.waitForSelector('[role="dialog"]', { state: 'detached' })
}

test('移动端使用标签栏而非侧边栏', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
  })
  const page = await context.newPage()
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('bookmark-navigation')
  })
  await page.goto('/')
  await page.waitForSelector('text=书签导航')

  await addBookmark(page, 'https://mobile.com', 'Mobile')
  await expect(page.getByRole('button', { name: '打开书签：Mobile' })).toBeVisible()

  // 移动端不应有侧边栏 aside
  await expect(page.locator('aside')).toHaveCount(0)
  await context.close()
})

test('PC 端使用侧边栏', async ({ page }) => {
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('bookmark-navigation')
  })
  await page.goto('/')
  await page.waitForSelector('text=书签导航')
  await expect(page.locator('aside')).toBeVisible()
})

test('移动端书签单列展示名称和地址', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } })
  const page = await context.newPage()
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('bookmark-navigation')
  })
  await page.goto('/')
  await page.waitForSelector('text=书签导航')
  await addBookmark(page, 'https://example.com/docs/start', '文档入口')

  const grid = page.getByRole('list', { name: '全部书签' })
  const columns = await grid.evaluate(
    (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
  )
  expect(columns).toBe(1)
  const bookmark = grid.getByRole('button', { name: '打开书签：文档入口' })
  await expect(bookmark).toContainText('example.com/docs/start')
  await expect(bookmark.getByRole('button', { name: '更多操作：文档入口' })).toBeVisible()
  await context.close()
})

test('超宽屏书签保持可读宽度而非拉满整屏', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 2560, height: 1440 } })
  const page = await context.newPage()
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('bookmark-navigation')
  })
  await page.goto('/')
  await page.waitForSelector('text=书签导航')
  await addBookmark(page, 'https://example.com', '宽屏测试')

  const grid = page.getByRole('list', { name: '全部书签' })
  const columns = await grid.evaluate(
    (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
  )
  const cardWidth = await grid
    .getByRole('button', { name: '打开书签：宽屏测试' })
    .evaluate((el) => el.getBoundingClientRect().width)
  expect(columns).toBe(5)
  expect(cardWidth).toBeGreaterThan(240)
  expect(cardWidth).toBeLessThan(300)
  await context.close()
})
