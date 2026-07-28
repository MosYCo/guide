import { test, expect, type Page } from '@playwright/test'

/**
 * T066: 响应式布局验证（移动端 <1024px）
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

test('移动端书签卡片每行 2 个', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
  })
  const page = await context.newPage()
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('bookmark-navigation')
  })
  await page.goto('/')
  await page.waitForSelector('text=书签导航')

  for (let i = 0; i < 4; i++) {
    await addBookmark(page, `https://m${i}.com`, `Mobile${i}`)
  }

  const grid = page.locator('.grid').first()
  await expect(grid).toHaveClass(/grid-cols-2/)
  await context.close()
})
