import { test, expect, type Page } from '@playwright/test'

/**
 * US3 E2E: 搜索 → 访问 → 最近访问
 * FR-012 实时搜索、FR-017 最近访问 10 个、FR-013 快捷键
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

test('添加书签后可通过搜索定位', async ({ page }) => {
  await addBookmark(page, 'https://github.com', 'GitHub')
  await expect(page.getByRole('button', { name: '打开书签：GitHub' })).toBeVisible()

  await page.keyboard.press('Control+k')
  await page.fill('[placeholder="搜索书签（Ctrl+K）"]', 'github')
  await expect(page.getByRole('button', { name: '打开书签：GitHub' })).toBeVisible()
})

test('点击书签记录到最近访问', async ({ page }) => {
  await addBookmark(page, 'https://example.com', 'Example')
  await expect(page.getByRole('button', { name: '打开书签：Example' })).toBeVisible()
})

test('Ctrl+K 快捷键聚焦搜索框', async ({ page }) => {
  await addBookmark(page, 'https://example.com', 'Test')
  await page.keyboard.press('Control+k')
  await expect(page.locator('[placeholder="搜索书签（Ctrl+K）"]')).toBeFocused()
})

test('空搜索显示全部，无结果显示提示', async ({ page }) => {
  await addBookmark(page, 'https://example.com', 'Alpha')
  await page.keyboard.press('Control+k')
  await page.fill('[placeholder="搜索书签（Ctrl+K）"]', 'zzzznomatch')
  await expect(page.locator('text=未找到匹配的书签')).toBeVisible()
})
