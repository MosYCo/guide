import { test, expect, type Page } from '@playwright/test'

/**
 * T029: 断点矩阵 E2E
 * SC-003: 标准断点逐档无横向溢出,减少动效降级
 * FR-011/012
 * @see specs/001-ui-ux-overhaul/quickstart.md §场景3
 */

const BREAKPOINTS = [
  { width: 360, name: '手机' },
  { width: 640, name: 'sm' },
  { width: 768, name: 'md 平板' },
  { width: 900, name: 'md 平板中段' },
  { width: 1024, name: 'lg PC' },
  { width: 1280, name: 'xl' },
  { width: 1536, name: '2xl' },
]

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

test.describe('断点矩阵 SC-003', () => {
  for (const bp of BREAKPOINTS) {
    test(`${bp.name} (${bp.width}px) 无横向溢出`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: bp.width, height: 800 },
      })
      const page = await context.newPage()
      await resetDB(page)
      await page.goto('/')
      await page.waitForSelector('text=书签导航')
      await addBookmark(page, 'https://example.com', '断点测试')

      // 检测横向滚动条(document.scrollWidth 不超过 viewport)
      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }
      })
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth)

      // 平板及 PC 应使用侧栏列表,而不是空侧栏 + 全屏底部 Tab
      if (bp.width >= 768) {
        await expect(
          page.locator('aside').getByText('分类', { exact: true }),
        ).toBeVisible()
        await expect(page.locator('nav.fixed.bottom-0')).toHaveCount(0)
      }

      await context.close()
    })
  }

  test('减少动效偏好降级动画', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    await resetDB(page)
    await page.goto('/')
    await page.waitForSelector('text=书签导航')

    // 验证过渡时长被降级到接近 0
    const transitionDuration = await page.evaluate(() => {
      const el = document.querySelector('button') as HTMLElement
      return getComputedStyle(el).transitionDuration
    })
    // 减少动效下应接近 0;computed style 可能返回 1e-05s 这类科学计数法
    const maxSeconds = Math.max(
      ...transitionDuration.split(',').map((value) => {
        const trimmed = value.trim()
        const numeric = parseFloat(trimmed)
        return trimmed.endsWith('ms') ? numeric / 1000 : numeric
      }),
    )
    expect(maxSeconds).toBeLessThanOrEqual(0.001)

    await context.close()
  })

  test('移动端底部 Tab 在拇指可达区', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    })
    const page = await context.newPage()
    await resetDB(page)
    await page.goto('/')
    await page.waitForSelector('text=书签导航')

    // 底部 Tab 应贴近视口底部(拇指可达)
    const tabBounds = await page.evaluate(() => {
      const nav = document.querySelector('nav.fixed.bottom-0')
      if (!nav) return null
      const rect = nav.getBoundingClientRect()
      return { top: rect.top, bottom: rect.bottom, vh: window.innerHeight }
    })
    expect(tabBounds).not.toBeNull()
    // Tab 起始位置应在视口下半部分(拇指可达)
    expect(tabBounds!.top).toBeGreaterThan(tabBounds!.vh / 2)

    await context.close()
  })
})
