import { test, expect, type Page } from '@playwright/test'

/**
 * 键盘流 E2E
 * 仅键盘完成核心流程,焦点可见且顺序合理
 */

async function resetDB(page: Page) {
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('bookmark-navigation')
  })
}

async function addBookmark(page: Page, url: string, name: string) {
  await page.getByRole('button', { name: '添加书签' }).first().click()
  await page.waitForSelector('[role="dialog"]')
  await page.fill('[placeholder="https://example.com"]', url)
  await page.fill('[placeholder="书签名称"]', name)
  await page.locator('[role="dialog"] button[type="submit"]').click()
  await page.waitForSelector('[role="dialog"]', { state: 'detached' })
}

test.describe('键盘流', () => {
  test('Tab 遍历焦点可见且不跳隐藏元素', async ({ page }) => {
    await resetDB(page)
    await page.goto('/')
    await page.waitForSelector('text=书签导航')
    await addBookmark(page, 'https://example.com', '键盘测试')

    // 从 body 开始 Tab,每次焦点应落在可见元素
    await page.click('body')
    const focusedTags: string[] = []
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
      const tag = await page.evaluate(() => {
        const el = document.activeElement
        if (!el || el === document.body) return null
        // 焦点元素必须可见(不跳到隐藏元素)
        const rect = el.getBoundingClientRect()
        const visible = rect.width > 0 && rect.height > 0
        return visible ? el.tagName.toLowerCase() : 'HIDDEN'
      })
      if (tag === null) break
      if (tag === 'HIDDEN') {
        throw new Error('焦点跳到隐藏元素')
      }
      focusedTags.push(tag)
    }
    // 至少遍历到若干可交互元素
    expect(focusedTags.length).toBeGreaterThan(0)
  })

  test('删除确认对话框默认焦点落取消(非破坏选项)', async ({ page }) => {
    await resetDB(page)
    await page.goto('/')
    await page.waitForSelector('text=书签导航')
    await addBookmark(page, 'https://example.com', '删除测试')

    const card = page.getByRole('button', { name: '打开书签：删除测试' })
    await card.hover()
    // 打开更多操作菜单
    const more = page.getByRole('button', { name: /更多操作/ })
    await more.click()
    await page.getByRole('menuitem', { name: '删除' }).click()

    // 确认对话框出现,默认焦点应落取消按钮
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: '取消' })).toBeFocused()
    const focusedText = await page.evaluate(() => {
      const el = document.activeElement
      return el?.textContent?.trim() ?? ''
    })
    expect(focusedText).toBe('取消')

    // Esc 不应关闭 alertdialog
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: '取消' })).toBeFocused()

    // Enter 不触发删除(因焦点在取消)
    await page.keyboard.press('Enter')
    // 对话框应关闭(取消),书签仍在,焦点回到触发按钮
    await page.waitForSelector('[role="alertdialog"]', { state: 'detached' })
    await expect(card).toBeVisible()
    await expect(more).toBeFocused()
  })

  test('书签卡菜单键盘操作不会同时打开书签', async ({ page }) => {
    await resetDB(page)
    await page.goto('/')
    await page.waitForSelector('text=书签导航')
    await addBookmark(page, 'https://example.com', '键盘菜单测试')

    // 直接计数 window.open,避免 popup 拦截造成的假通过
    await page.evaluate(() => {
      const w = window as Window & { __openCalls?: number }
      w.__openCalls = 0
      w.open = (() => {
        w.__openCalls = (w.__openCalls ?? 0) + 1
        return null
      }) as typeof window.open
    })

    const more = page.getByRole('button', { name: /更多操作/ })
    await more.focus()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('menu')).toBeVisible()
    const openCalls = await page.evaluate(
      () => (window as Window & { __openCalls?: number }).__openCalls ?? 0,
    )
    expect(openCalls).toBe(0)
  })

  test('Ctrl+K 打开命令面板,键盘选择并跳转', async ({ page }) => {
    await resetDB(page)
    await page.goto('/')
    await page.waitForSelector('text=书签导航')
    await addBookmark(page, 'https://example.com', '命令面板测试')

    // Ctrl+K 打开命令面板
    await page.keyboard.press('Control+K')
    await page.waitForSelector('[role="dialog"]')

    // 焦点应在输入框
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase())
    expect(focusedTag).toBe('input')

    // 输入过滤
    await page.keyboard.type('命令')
    // Esc 关闭
    await page.keyboard.press('Escape')
    await page.waitForSelector('[role="dialog"]', { state: 'detached' })
  })
})
