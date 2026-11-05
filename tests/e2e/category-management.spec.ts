import { test, expect, type Page } from '@playwright/test'

const CATEGORY_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='16' height='16' fill='%23f97316'/%3E%3C/svg%3E"

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
  const moveItem = page.getByRole('menuitem', { name: '移动到分类' })
  const editIcon = await page.getByRole('menuitem', { name: '编辑' }).locator('svg').boundingBox()
  const moveIcon = await moveItem.locator('svg').first().boundingBox()
  expect(editIcon).not.toBeNull()
  expect(moveIcon).not.toBeNull()
  expect(Math.abs(moveIcon!.x - editIcon!.x)).toBeLessThan(2)
  await moveItem.hover()
  const workItem = page.getByRole('menuitem', { name: 'Work' })
  await expect(workItem).toBeVisible()
  await workItem.click()

  const aside = page.locator('aside')
  await aside.getByRole('button', { name: /^Work/ }).click()
  await expect(card).toBeVisible()
})

test('折叠侧栏显示分类图标，无图标时回退首字符', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('text=书签导航')

  await page.getByRole('button', { name: '新建分类' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('#category-name').fill('Work')
  await dialog.locator('#category-icon').fill(CATEGORY_ICON)
  await dialog.getByRole('button', { name: '创建' }).click()
  await expect(dialog).toBeHidden()

  await addCategory(page, 'Personal')

  await page.getByRole('button', { name: '收起侧栏' }).click()
  const nav = page.getByRole('navigation', { name: '分类导航（折叠）' })
  const workButton = nav.getByRole('button', { name: 'Work' })
  await expect(workButton.locator('img')).toHaveAttribute('src', CATEGORY_ICON)

  const personalButton = nav.getByRole('button', { name: 'Personal' })
  await expect(personalButton.locator('img')).toHaveCount(0)
  await expect(personalButton.getByTestId('category-icon-fallback')).toHaveText('P')

  // 折叠态与图标一起持久化，刷新后仍生效
  await page.reload()
  await page.waitForSelector('text=书签导航')
  const collapsedNav = page.getByRole('navigation', { name: '分类导航（折叠）' })
  await expect(collapsedNav.getByRole('button', { name: 'Work' }).locator('img')).toHaveAttribute(
    'src',
    CATEGORY_ICON,
  )
})

test('折叠侧栏显示预置图标与固定颜色', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('text=书签导航')

  await page.getByRole('button', { name: '新建分类' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('#category-name').fill('学习')
  await dialog.getByRole('button', { name: '使用图标：学习' }).click()
  await dialog.getByRole('button', { name: '颜色：蓝色' }).click()
  await dialog.getByRole('button', { name: '创建' }).click()
  await expect(dialog).toBeHidden()

  await page.getByRole('button', { name: '收起侧栏' }).click()
  const nav = page.getByRole('navigation', { name: '分类导航（折叠）' })
  const icon = nav.getByRole('button', { name: '学习' }).getByTestId('category-icon-preset')
  await expect(icon).toHaveClass(/lucide-graduation-cap/)
  await expect(icon).toHaveClass(/text-blue-600/)

  // token 与颜色随分类持久化，刷新后仍生效
  await page.reload()
  await page.waitForSelector('text=书签导航')
  const reloadedIcon = page
    .getByRole('navigation', { name: '分类导航（折叠）' })
    .getByRole('button', { name: '学习' })
    .getByTestId('category-icon-preset')
  await expect(reloadedIcon).toHaveClass(/lucide-graduation-cap/)
  await expect(reloadedIcon).toHaveClass(/text-blue-600/)
})

test('编辑分类图标后页面仍可交互', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('text=书签导航')
  await addCategory(page, 'Work')

  const aside = page.locator('aside')
  const row = aside.locator('div.group').filter({ hasText: 'Work' }).first()
  await row.hover()
  await row.getByRole('button', { name: /分类操作/ }).click()
  await page.getByRole('menuitem', { name: '编辑' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: '使用图标：工作' }).click()
  await dialog.getByRole('button', { name: '颜色：蓝色' }).click()
  await dialog.getByRole('button', { name: '保存' }).click()
  await expect(dialog).toBeHidden()

  // 回归：从菜单打开编辑框时，body 不应残留 pointer-events: none 导致整页不可点击
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).pointerEvents))
    .toBe('auto')
  await page.getByRole('button', { name: '添加书签' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('刷新后保留选中的分类，分类不存在时回退全部', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('text=书签导航')
  await addCategory(page, 'Work')

  const aside = page.locator('aside')
  await aside.getByRole('button', { name: /^Work/ }).click()
  await expect(aside.getByRole('button', { name: /^Work/ })).toHaveAttribute('aria-current', 'page')

  await page.reload()
  await page.waitForSelector('text=书签导航')
  await expect(page.locator('aside').getByRole('button', { name: /^Work/ })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(page.locator('aside').getByRole('button', { name: /^全部/ })).not.toHaveAttribute(
    'aria-current',
    'page',
  )

  // 失效的分类 ID（例如其他标签页已删除）回退到“全部”
  await page.evaluate(() => localStorage.setItem('selected-category-id', 'missing-category'))
  await page.reload()
  await page.waitForSelector('text=书签导航')
  await expect(page.locator('aside').getByRole('button', { name: /^全部/ })).toHaveAttribute(
    'aria-current',
    'page',
  )
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
  await expect(bookmarkDialog.locator('#bookmark-category')).toContainText('未分类')
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
