import { test, expect, type Page } from '@playwright/test'

async function addBookmark(page: Page, name: string) {
  await page.getByRole('button', { name: '添加书签' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('[placeholder="https://example.com"]').fill('https://example.com')
  await dialog.locator('[placeholder="书签名称"]').fill(name)
  await dialog.locator('button[type="submit"]').click()
  await expect(dialog).toBeHidden()
}

async function pinFromAll(page: Page, name: string) {
  const card = page
    .getByRole('list', { name: '全部书签' })
    .getByRole('button', { name: `打开书签：${name}` })
  await card.getByRole('button', { name: `更多操作：${name}` }).click()
  await page.getByRole('menuitem', { name: '置顶', exact: true }).click()
}

test('置顶最多 5 个，可取消、刷新后保留，最近访问不重复', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('status').filter({ hasText: '已加载 0 个书签' })).toBeVisible()
  for (let index = 1; index <= 6; index++) await addBookmark(page, `书签 ${index}`)

  for (let index = 1; index <= 5; index++) await pinFromAll(page, `书签 ${index}`)
  const pinned = page.getByRole('list', { name: '置顶书签' })
  await expect(pinned.getByRole('listitem')).toHaveCount(5)
  await pinFromAll(page, '书签 6')
  await expect(page.getByRole('alert').filter({ hasText: '最多置顶 5 个书签' })).toBeVisible()
  await expect(pinned.getByRole('listitem')).toHaveCount(5)

  const card = pinned.getByRole('button', { name: '打开书签：书签 1' })
  await card.getByRole('button', { name: '更多操作：书签 1' }).click()
  await page.getByRole('menuitem', { name: '取消置顶' }).click()
  await pinFromAll(page, '书签 6')
  await expect(pinned.getByRole('button', { name: '打开书签：书签 6' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('list', { name: '置顶书签' }).getByRole('listitem')).toHaveCount(5)
  await expect(page.getByRole('list', { name: '全部书签' }).getByRole('listitem')).toHaveCount(6)

  // 点击卡片后即使出现在最近访问，置顶区域仍是唯一的快捷入口。
  await page
    .getByRole('list', { name: '全部书签' })
    .getByRole('button', { name: '打开书签：书签 6' })
    .click()
  await expect(page.getByRole('list', { name: '最近访问' })).toHaveCount(0)
})
