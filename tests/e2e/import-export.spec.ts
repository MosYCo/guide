import { test, expect, type Page } from '@playwright/test'

/**
 * US6 E2E: JSON 导入导出闭环
 * FR-015 导出、FR-018 JSON 导入
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
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('bookmark-navigation')
  })
  await page.goto('/')
  await page.waitForSelector('text=书签导航')
})

test('导出 JSON 文件下载', async ({ page }) => {
  await addBookmark(page, 'https://export.com', 'ExportMe')
  await expect(page.locator('text=ExportMe')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.click('button:has-text("导出")')
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/bookmarks-.*\.json/)
})

test('导入无效 JSON 文件被拒绝，原数据保留', async ({ page }) => {
  await addBookmark(page, 'https://keep.com', 'KeepMe')
  await expect(page.getByRole('button', { name: '打开书签：KeepMe' })).toBeVisible()

  await page.setInputFiles('input[type="file"]', {
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('not valid json'),
  })

  // 应弹出错误提示对话框（证明导入被拒绝，未写入）
  await expect(page.getByText('JSON 格式错误，无法解析')).toBeVisible({ timeout: 5000 })
  // 关闭对话框
  await page.click('button:has-text("关闭")')
  await page.waitForSelector('[role="dialog"]', { state: 'detached' })
  // 原数据保留
  await expect(page.getByRole('button', { name: '打开书签：KeepMe' })).toBeVisible()
})
