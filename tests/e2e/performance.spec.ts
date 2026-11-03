import { test, expect, type Page } from '@playwright/test'

/**
 * T057/T070: 性能验证
 * SC-004: 100 个书签 <2s 加载
 * SC-006: 搜索响应 <500ms（含输入与渲染）
 *
 * 这些是 dev server 上的烟测;严格预算见 docs/quality-baseline.md。
 * CI 共享 runner 上适当放宽,避免把机器抖动当成性能回归。
 */

const LOAD_BUDGET_MS = process.env.CI ? 4000 : 2000
const SEARCH_BUDGET_MS = process.env.CI ? 1500 : 500

async function injectBookmarks(page: Page, count: number) {
  // 先让应用建好 schema,再在同一页面里 await 事务完成,最后 reload 让 hook 读到数据
  await page.goto('/')
  await page.evaluate(async (n) => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('bookmark-navigation', 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('bookmarks')) {
          const store = db.createObjectStore('bookmarks', { keyPath: 'id' })
          store.createIndex('categoryId', 'categoryId')
          store.createIndex('createdAt', 'createdAt')
          store.createIndex('lastVisitedAt', 'lastVisitedAt')
          store.createIndex('url', 'url')
        }
        if (!db.objectStoreNames.contains('categories')) {
          const cstore = db.createObjectStore('categories', { keyPath: 'id' })
          cstore.createIndex('order', 'order')
          cstore.createIndex('name', 'name')
        }
      }
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('bookmarks', 'readwrite')
        const store = tx.objectStore('bookmarks')
        for (let i = 0; i < n; i++) {
          store.add({
            id: `perf-bm-${i}`,
            url: `https://example${i}.com`,
            name: `Site ${i}`,
            icon: '',
            categoryId: null,
            createdAt: new Date().toISOString(),
            lastVisitedAt: null,
          })
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
    })
  }, count)
  await page.reload()
}

test('100 个书签页面加载 <2s', async ({ page }) => {
  await injectBookmarks(page, 100)

  // 虚拟列表只渲染可视区,不能假设 Site 0 在首屏
  await page
    .getByRole('button', { name: /打开书签：Site \d+/ })
    .first()
    .waitFor()
  // 页面内 performance.now() 从 navigation timeOrigin 起算
  const elapsed = await page.evaluate(() => performance.now())
  expect(elapsed).toBeLessThan(LOAD_BUDGET_MS)
})

test('搜索响应 <500ms', async ({ page }) => {
  await injectBookmarks(page, 100)
  await page
    .getByRole('button', { name: /打开书签：Site \d+/ })
    .first()
    .waitFor()

  await page.keyboard.press('Control+k')
  const start = await page.evaluate(() => performance.now())
  await page.fill('[placeholder="搜索书签（上下选择,回车打开）"]', 'Site 50')
  await expect(page.getByRole('dialog').getByText('Site 50')).toBeVisible()
  const elapsed = (await page.evaluate(() => performance.now())) - start
  expect(elapsed).toBeLessThan(SEARCH_BUDGET_MS)
})

test('>60 条书签使用多列虚拟网格', async ({ page }) => {
  await injectBookmarks(page, 100)

  const list = page.getByTestId('bookmark-virtual-list')
  await expect(list).toBeVisible()
  const cards = list.getByRole('button', { name: /打开书签：Site \d+/ })
  await expect(cards.first()).toBeVisible()

  // 只渲染可视行,而不是全部 100 条
  const rendered = await cards.count()
  expect(rendered).toBeGreaterThan(12)
  expect(rendered).toBeLessThan(100)

  // 1280px 下应为 6 列,卡片高度与虚拟行高一致
  const grid = list.getByTestId('bookmark-virtual-grid')
  const columns = await grid.evaluate(
    (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
  )
  expect(columns).toBe(6)
  const cardHeight = await cards.first().evaluate((el) => el.getBoundingClientRect().height)
  expect(Math.round(cardHeight)).toBe(130)

  // 滚动后应渲染新的行
  const firstText = (await cards.first().textContent()) ?? ''
  await list.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await expect.poll(async () => (await cards.first().textContent()) ?? '').not.toBe(firstText)
})

test('命令面板方向键滚动跟随高亮项', async ({ page }) => {
  await injectBookmarks(page, 100)
  await page
    .getByRole('button', { name: /打开书签：Site \d+/ })
    .first()
    .waitFor()

  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('combobox', { name: '搜索书签' })).toBeFocused()
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('ArrowDown')
  }
  const active = dialog.locator('[data-active="true"]')
  await expect(active).toBeVisible()
  await expect(active).toContainText('Site')
  const scrollTop = await dialog.getByTestId('command-results').evaluate((el) => el.scrollTop)
  expect(scrollTop).toBeGreaterThan(0)
})

test('虚拟滚动不会把键盘焦点丢到 body', async ({ page }) => {
  await injectBookmarks(page, 100)
  const first = page.getByRole('button', { name: /打开书签：Site \d+/ }).first()
  await first.focus()

  const list = page.getByTestId('bookmark-virtual-list')
  await list.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })

  await expect.poll(() => list.evaluate((el) => document.activeElement === el)).toBe(true)
})

test('根字号 20px 时虚拟度量同步缩放', async ({ page }) => {
  await injectBookmarks(page, 100)
  await page.addStyleTag({ content: 'html { font-size: 20px !important; }' })
  await page.waitForFunction(() => getComputedStyle(document.documentElement).fontSize === '20px')
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))

  const card = page.getByRole('button', { name: /打开书签：Site \d+/ }).first()
  await expect(card).toBeVisible()
  // 8.125rem * 20px ≈ 162.5,允许子像素取整
  await expect
    .poll(async () => card.evaluate((el) => el.getBoundingClientRect().height))
    .toBeGreaterThan(150)

  await page.keyboard.press('Control+k')
  const option = page.getByRole('option').first()
  await expect(option).toBeVisible()
  const optionHeight = await option.evaluate((el) => el.getBoundingClientRect().height)
  // h-14 = 3.5rem * 20px = 70
  expect(optionHeight).toBeGreaterThan(60)
  expect(optionHeight).toBeLessThan(80)
})

test('虚拟列表方向键使用 roving tabindex 移动焦点', async ({ page }) => {
  await injectBookmarks(page, 100)
  const first = page.getByRole('button', { name: /打开书签：Site \d+/ }).first()
  await first.focus()
  await page.keyboard.press('ArrowRight')

  await expect
    .poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-card-index')))
    .toBe('1')
})

test('命令面板滚轮滚动后高亮项仍在可视区', async ({ page }) => {
  await injectBookmarks(page, 100)
  await page.keyboard.press('Control+k')

  const dialog = page.getByRole('dialog')
  const results = dialog.getByTestId('command-results')
  await expect(results).toBeVisible()
  await results.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await expect(dialog.locator('[data-active="true"]')).toBeVisible()
})
