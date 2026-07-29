import { test, expect, type Page } from '@playwright/test'

/**
 * T031: 主题 FOUC E2E
 * SC-005: 首屏渲染前 .dark class 已就位,无亮→暗闪烁
 * FR-017
 * @see specs/001-ui-ux-overhaul/quickstart.md §场景5
 */

async function resetDB(page: Page) {
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('bookmark-navigation')
  })
}

test.describe('主题 FOUC SC-005', () => {
  test('暗色主题:首帧 html 即有 dark class(无 FOUC)', async ({ page }) => {
    await resetDB(page)
    await page.addInitScript(() => {
      localStorage.setItem('bookmark-theme', 'dark')
    })

    // 监听首个 DOM 节点,捕获 html 在首帧的 class
    let firstFrameHasDark = false
    page.on('domcontentloaded', async () => {
      firstFrameHasDark = await page.evaluate(() =>
        document.documentElement.classList.contains('dark'),
      )
    })

    await page.goto('/')
    await page.waitForSelector('text=书签导航')

    // 首帧(DOMContentLoaded)时 html 应已含 dark
    expect(firstFrameHasDark).toBe(true)

    // 稳态后仍是 dark
    const stableHasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(stableHasDark).toBe(true)
  })

  test('亮色主题:首帧 html 无 dark class', async ({ page }) => {
    await resetDB(page)
    await page.addInitScript(() => {
      localStorage.setItem('bookmark-theme', 'light')
    })

    let firstFrameHasDark = false
    page.on('domcontentloaded', async () => {
      firstFrameHasDark = await page.evaluate(() =>
        document.documentElement.classList.contains('dark'),
      )
    })

    await page.goto('/')
    await page.waitForSelector('text=书签导航')

    expect(firstFrameHasDark).toBe(false)
    const stable = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(stable).toBe(false)
  })

  test('系统主题(暗色偏好):首帧 html 有 dark class', async ({ browser }) => {
    const context = await browser.newContext({
      colorScheme: 'dark',
    })
    const page = await context.newPage()
    await resetDB(page)
    // 不设 localStorage,走 system
    await page.addInitScript(() => {
      localStorage.removeItem('bookmark-theme')
    })

    await page.goto('/')
    await page.waitForSelector('text=书签导航')

    // 系统 dark 偏好 → 首帧应有 dark class
    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(hasDark).toBe(true)

    await context.close()
  })

  test('运行时切换主题即时生效', async ({ page }) => {
    await resetDB(page)
    await page.addInitScript(() => {
      localStorage.setItem('bookmark-theme', 'light')
    })
    await page.goto('/')
    await page.waitForSelector('text=书签导航')

    // 点主题切换按钮(light → dark)
    await page.getByRole('button', { name: /切换主题/ }).click()

    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(hasDark).toBe(true)
  })
})
