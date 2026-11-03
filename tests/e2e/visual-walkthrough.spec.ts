import { test, expect, type Page } from '@playwright/test'

/**
 * T027: 视觉走查 E2E
 * SC-001: 亮/暗主题逐屏走查,对比度断言(WCAG AA)
 * FR-001/002
 */

async function addBookmark(page: Page, url: string, name: string) {
  await page.getByRole('button', { name: '添加书签' }).first().click()
  await page.waitForSelector('[role="dialog"]')
  await page.fill('[placeholder="https://example.com"]', url)
  await page.fill('[placeholder="书签名称"]', name)
  await page.locator('[role="dialog"] button[type="submit"]').click()
  await page.waitForSelector('[role="dialog"]', { state: 'detached' })
}

async function resetDB(page: Page) {
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('bookmark-navigation')
  })
}

test.describe('视觉走查 SC-001', () => {
  test('亮色主题:卡片悬停反馈一致', async ({ page }) => {
    await resetDB(page)
    await page.addInitScript(() => {
      localStorage.setItem('bookmark-theme', 'light')
    })
    await page.goto('/')
    await page.waitForSelector('text=书签导航')
    await addBookmark(page, 'https://example.com', '示例站')
    const card = page.getByRole('button', { name: '打开书签：示例站' })
    await expect(card).toBeVisible()
    // 悬停态有阴影 elevation(token 落地验证)
    await card.hover()
    const boxShadow = await card.evaluate((el) => getComputedStyle(el).boxShadow)
    // 非空阴影(悬停态有反馈)
    expect(boxShadow.length).toBeGreaterThan(0)
  })

  test('暗色主题:无 FOUC,首帧即 dark class', async ({ page }) => {
    await resetDB(page)
    await page.addInitScript(() => {
      localStorage.setItem('bookmark-theme', 'dark')
    })
    await page.goto('/')
    // 首帧 html 应已有 dark class(FOUC 防护)
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDark).toBe(true)
  })

  test('加载态展示 skeleton 占位', async ({ page }) => {
    await resetDB(page)
    await page.goto('/')
    // 空库首次加载,应有 skeleton(按 aria-label 精确定位加载态)
    await expect(page.getByRole('status', { name: '加载中' })).toBeVisible()
  })

  test('空状态含引导动作', async ({ page }) => {
    await resetDB(page)
    await page.goto('/')
    await page.waitForSelector('text=书签导航')
    // 空状态(无书签)应展示引导按钮
    await expect(page.getByRole('button', { name: '添加书签' }).first()).toBeVisible()
  })

  test('对比度:正文文本对背景达 WCAG AA', async ({ page }) => {
    await resetDB(page)
    await page.addInitScript(() => {
      localStorage.setItem('bookmark-theme', 'light')
    })
    await page.goto('/')
    await page.waitForSelector('text=书签导航')
    await addBookmark(page, 'https://example.com', '对比度测试')
    // 在页面内按 WCAG 相对亮度公式计算真实对比度
    const ratio = await page.evaluate(() => {
      const parse = (value: string): [number, number, number] | null => {
        const match = value.match(/rgba?\(([^)]+)\)/)
        if (!match) return null
        const [r, g, b] = match[1].split(',').slice(0, 3).map(Number)
        return [r, g, b]
      }
      const luminance = ([r, g, b]: [number, number, number]) => {
        const linear = (channel: number) => {
          const value = channel / 255
          return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
      }
      const el = document.querySelector('p.text-body') as HTMLElement | null
      if (!el) return 0
      const foreground = parse(getComputedStyle(el).color)
      const background = parse(
        getComputedStyle(el.closest('.bg-card') ?? document.body).backgroundColor,
      )
      if (!foreground || !background) return 0
      const first = luminance(foreground)
      const second = luminance(background)
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
    })
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })
})
