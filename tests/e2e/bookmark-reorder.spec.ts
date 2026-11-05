import { test, expect, type Page } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 720 } })

async function addCategory(page: Page, name: string) {
  await page.getByRole('button', { name: '新建分类' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('#category-name').fill(name)
  await dialog.getByRole('button', { name: '创建' }).click()
  await expect(dialog).toBeHidden()
}

async function addBookmark(page: Page, name: string, category: string) {
  await page.getByRole('button', { name: '添加书签' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('[placeholder="https://example.com"]').fill('https://example.com')
  await dialog.locator('[placeholder="书签名称"]').fill(name)
  await dialog.locator('#bookmark-category').click()
  await page.getByRole('option', { name: category, exact: true }).click()
  await dialog.locator('button[type="submit"]').click()
  await expect(dialog).toBeHidden()
}

/** 主列表当前顺序（按卡片 aria-label 提取书签名） */
async function bookmarkNames(page: Page): Promise<string[]> {
  return page
    .getByRole('list', { name: '全部书签' })
    .locator('[role="button"][aria-label^="打开书签："]')
    .evaluateAll((cards) =>
      cards.map((card) => (card.getAttribute('aria-label') ?? '').replace('打开书签：', '')),
    )
}

test('分类内可拖拽排序，菜单提供等价路径，刷新后保留', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('status').filter({ hasText: '已加载 0 个书签' })).toBeVisible()
  await addCategory(page, 'Work')
  for (const name of ['Work A', 'Work B', 'Work C']) await addBookmark(page, name, 'Work')

  // 切到分类视图：新增顺序为 C/B/A
  await page.locator('aside').getByRole('button', { name: /^Work/ }).click()
  await expect.poll(() => bookmarkNames(page)).toEqual(['Work C', 'Work B', 'Work A'])

  // 多列网格：把第一张拖到最后一张右半区 → 插到其后方
  const list = page.getByRole('list', { name: '全部书签' })
  const target = list.getByRole('button', { name: '打开书签：Work A' })
  const targetBox = await target.boundingBox()
  if (!targetBox) throw new Error('未找到拖拽目标')
  await list.getByRole('button', { name: '打开书签：Work C' }).dragTo(target, {
    targetPosition: { x: targetBox.width - 12, y: targetBox.height / 2 },
  })
  await expect.poll(() => bookmarkNames(page)).toEqual(['Work B', 'Work A', 'Work C'])

  // 键盘/触屏等价路径：菜单“前移”
  const moved = list.getByRole('button', { name: '打开书签：Work C' })
  await moved.getByRole('button', { name: '更多操作：Work C' }).click()
  await page.getByRole('menuitem', { name: '前移' }).click()
  await expect.poll(() => bookmarkNames(page)).toEqual(['Work B', 'Work C', 'Work A'])

  // 刷新后重新进入分类，顺序仍保留
  await page.reload()
  await expect(page.getByRole('status').filter({ hasText: '已加载 3 个书签' })).toBeVisible()
  await page.locator('aside').getByRole('button', { name: /^Work/ }).click()
  await expect.poll(() => bookmarkNames(page)).toEqual(['Work B', 'Work C', 'Work A'])

  // 菜单“后移”
  await list
    .getByRole('button', { name: '打开书签：Work B' })
    .getByRole('button', {
      name: '更多操作：Work B',
    })
    .click()
  await page.getByRole('menuitem', { name: '后移' }).click()
  await expect.poll(() => bookmarkNames(page)).toEqual(['Work C', 'Work B', 'Work A'])
})
