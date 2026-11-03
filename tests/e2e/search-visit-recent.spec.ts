import { test, expect, type Page } from '@playwright/test'

/**
 * E2E: 搜索 → 访问 → 最近访问
 * 选择器对齐重构后的 CommandPalette 搜索流(Ctrl+K 打开面板 →
 * 面板内输入 placeholder="搜索书签（上下选择,回车打开）" → 结果/空态由面板承载)
 * 命令面板搜索、最近访问 10 个
 * 与  keyboard-flow 互补:本 spec 聚焦搜索定位与最近访问数据流
 */

async function addBookmark(page: Page, url: string, name: string) {
  await page.getByRole('button', { name: '添加书签' }).first().click()
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

test('添加书签后可通过命令面板搜索定位', async ({ page }) => {
  await addBookmark(page, 'https://github.com', 'GitHub')
  await expect(page.getByRole('button', { name: '打开书签：GitHub' })).toBeVisible()

  // Ctrl+K 打开命令面板,在面板内输入(非内联框)
  await page.keyboard.press('Control+K')
  await page.waitForSelector('[role="dialog"]')
  // 命令面板内的输入框 placeholder 为新文案;结果与背后的卡片同名,需限定在 dialog 内
  const dialog = page.getByRole('dialog')
  await page.fill('[placeholder="搜索书签（上下选择,回车打开）"]', 'github')
  await expect(dialog.getByRole('option', { name: /打开书签：GitHub/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.waitForSelector('[role="dialog"]', { state: 'detached' })
})

test('点击书签记录到最近访问', async ({ page }) => {
  await addBookmark(page, 'https://example.com', 'Example')
  const card = page.getByRole('button', { name: '打开书签：Example' })
  await expect(card).toBeVisible()

  // 阻止真的打开新标签页,只验证 recordVisit 的数据流
  await page.evaluate(() => {
    Object.defineProperty(window, 'open', {
      value: () => null,
      configurable: true,
    })
  })
  await card.click()
  await expect(page.getByText('最近访问')).toBeVisible()
})

test('Ctrl+K 快捷键打开命令面板并聚焦输入框', async ({ page }) => {
  await addBookmark(page, 'https://example.com', 'Test')
  await page.keyboard.press('Control+K')
  await page.waitForSelector('[role="dialog"]')
  // 命令面板打开后焦点应落输入框
  const focusedTag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase())
  expect(focusedTag).toBe('input')
  await page.keyboard.press('Escape')
})

test('命令面板无匹配结果显示空态', async ({ page }) => {
  await addBookmark(page, 'https://example.com', 'Alpha')
  await page.keyboard.press('Control+K')
  await page.waitForSelector('[role="dialog"]')
  await page.fill('[placeholder="搜索书签（上下选择,回车打开）"]', 'zzzznomatch')
  await expect(page.locator('text=未找到匹配的书签')).toBeVisible()
  await page.keyboard.press('Escape')
})
