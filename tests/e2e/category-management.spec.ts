import { test, expect, type Page } from '@playwright/test'

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
  await dialog.locator('#bookmark-category').selectOption({ label: category })
  await dialog.locator('button[type="submit"]').click()
  await expect(dialog).toBeHidden()
}

test('通过菜单把书签移动到分类(键盘/触屏等价路径)', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('text=书签导航')
  await addCategory(page, 'Work')

  await page.getByRole('button', { name: '添加书签' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('[placeholder="https://example.com"]').fill('https://example.com')
  await dialog.locator('[placeholder="书签名称"]').fill('Movable')
  await dialog.locator('button[type="submit"]').click()
  await expect(dialog).toBeHidden()

  const card = page.getByRole('button', { name: '打开书签：Movable' })
  await card.hover()
  await card.getByRole('button', { name: /更多操作/ }).click()
  await page.getByRole('menuitem', { name: '移动到分类' }).hover()
  const workItem = page.getByRole('menuitem', { name: 'Work' })
  await expect(workItem).toBeVisible()
  await workItem.click()

  const aside = page.locator('aside')
  await aside.getByRole('button', { name: /^Work/ }).click()
  await expect(card).toBeVisible()
})

test('删除分类后编辑书签不会把悬空分类 ID 写回', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('text=书签导航')
  await addCategory(page, 'Work')
  await addBookmark(page, 'Example', 'Work')

  const aside = page.locator('aside')
  const categoryRow = aside.locator('div.group').filter({ hasText: 'Work' }).first()
  await categoryRow.hover()
  await categoryRow.getByRole('button', { name: /分类操作/ }).click()
  await page.getByRole('menuitem', { name: '删除' }).click()

  const confirm = page.getByRole('alertdialog')
  await expect(confirm).toBeVisible()
  await confirm.getByRole('button', { name: '删除' }).click()
  await expect(confirm).toBeHidden()
  // 等关闭动画结束、遮罩从 DOM 移除,否则下一次 hover 会被遮罩拦截
  await page.waitForSelector('[role="alertdialog"]', { state: 'detached' })
  await expect(aside.getByText('Work', { exact: true })).toHaveCount(0)

  // 分类删除后编辑书签:表单不应再预填悬空 categoryId
  const card = page.getByRole('button', { name: '打开书签：Example' })
  await card.hover()
  await card.getByRole('button', { name: /更多操作/ }).click()
  await page.getByRole('menuitem', { name: '编辑' }).click()

  const bookmarkDialog = page.getByRole('dialog')
  await expect(bookmarkDialog).toBeVisible()
  await expect(bookmarkDialog.locator('#bookmark-category')).toHaveValue('')
  await bookmarkDialog.locator('button[type="submit"]').click()
  await expect(bookmarkDialog).toBeHidden()

  const stored = await page.evaluate(async () => {
    return new Promise<Array<{ categoryId: string | null }>>((resolve, reject) => {
      const req = indexedDB.open('bookmark-navigation', 1)
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('bookmarks', 'readonly')
        const all = tx.objectStore('bookmarks').getAll()
        all.onerror = () => reject(all.error)
        all.onsuccess = () => resolve(all.result as Array<{ categoryId: string | null }>)
      }
    })
  })
  expect(stored).toHaveLength(1)
  expect(stored[0].categoryId).toBeNull()
})
