import { describe, it, expect, beforeEach } from 'vitest'
import {
  exportToJson,
  downloadJson,
  parseJsonFile,
  importFromJson,
  parseHtmlFile,
  importFromHtml,
} from '@/services/import-export'
import {
  _resetDBForTesting,
  getDB,
  addBookmark,
  addCategory,
  getAllBookmarks,
  getAllCategories,
} from '@/services/db'
import type { Bookmark, Category, ExportData } from '@/types'

function makeBookmark(over: Partial<Bookmark> = {}): Bookmark {
  return {
    id: crypto.randomUUID(),
    url: 'https://example.com',
    name: 'Example',
    icon: 'https://icon.example.com',
    categoryId: null,
    createdAt: '2026-01-01T00:00:00Z',
    lastVisitedAt: null,
    ...over,
  }
}

function makeCategory(over: Partial<Category> = {}): Category {
  return {
    id: crypto.randomUUID(),
    name: 'Test',
    order: 0,
    createdAt: '2026-01-01T00:00:00Z',
    ...over,
  }
}

function makeFile(content: string, name = 'test.json'): File {
  return new File([content], name, { type: 'application/json' })
}

describe('导入导出服务', () => {
  beforeEach(async () => {
    _resetDBForTesting()
    const db = await getDB()
    await db.clear('bookmarks')
    await db.clear('categories')
  })

  describe('FR-015: JSON 导出', () => {
    it('导出包含所有书签和分类', async () => {
      const cat = makeCategory({ name: '工作' })
      await addCategory(cat)
      await addBookmark(makeBookmark({ categoryId: cat.id, name: 'B1' }))
      await addBookmark(makeBookmark({ name: 'B2', categoryId: null }))

      const data = await exportToJson()
      expect(data.version).toBe('1.0.0')
      expect(data.bookmarkCount).toBe(2)
      expect(data.categoryCount).toBe(1)
      expect(data.categories[0].name).toBe('工作')
      expect(data.bookmarks).toHaveLength(2)
    })

    it('导出空数据库', async () => {
      const data = await exportToJson()
      expect(data.bookmarkCount).toBe(0)
      expect(data.categoryCount).toBe(0)
      expect(data.bookmarks).toEqual([])
    })

    it('downloadJson 构造 Blob（jsdom 无 URL.createObjectURL 时跳过 DOM 调用）', () => {
      const data: ExportData = {
        version: '1.0.0',
        exportedAt: '2026-07-28T00:00:00Z',
        bookmarkCount: 0,
        categoryCount: 0,
        categories: [],
        bookmarks: [],
      }
      // jsdom 缺少 createObjectURL，仅验证不因数据格式抛错
      try {
        downloadJson(data, 'test.json')
      } catch (e) {
        // 允许 createObjectURL 不存在的环境错误
        expect(String(e)).toMatch(/createObjectURL|download/)
      }
    })
  })

  describe('FR-018: JSON 导入', () => {
    it('解析有效 JSON 文件', async () => {
      const exportData: ExportData = {
        version: '1.0.0',
        exportedAt: '2026-07-28T00:00:00Z',
        bookmarkCount: 1,
        categoryCount: 1,
        categories: [makeCategory({ name: '导入分类' })],
        bookmarks: [makeBookmark({ name: '导入书签' })],
      }
      const file = makeFile(JSON.stringify(exportData))
      const { preview, data } = await parseJsonFile(file)
      expect(preview.bookmarks).toBe(1)
      expect(preview.categories).toBe(1)
      expect(data.version).toBe('1.0.0')
    })

    it('预览阶段统计将被跳过的非 http/https 书签', async () => {
      const exportData: ExportData = {
        version: '1.0.0',
        exportedAt: '2026-07-28T00:00:00Z',
        bookmarkCount: 2,
        categoryCount: 0,
        categories: [],
        bookmarks: [
          makeBookmark({ name: '合法', url: 'https://example.com' }),
          makeBookmark({ name: '非法', url: 'javascript:alert(1)' }),
        ],
      }
      const file = makeFile(JSON.stringify(exportData))
      const { preview } = await parseJsonFile(file)
      expect(preview.bookmarks).toBe(2)
      expect(preview.skipped).toBe(1)
    })

    it('拒绝无效 JSON', async () => {
      const file = makeFile('not json')
      await expect(parseJsonFile(file)).rejects.toThrow('JSON 格式错误')
    })

    it('拒绝缺少 version 的文件', async () => {
      const file = makeFile(JSON.stringify({ categories: [], bookmarks: [] }))
      await expect(parseJsonFile(file)).rejects.toThrow('version')
    })

    it('拒绝字段缺失的书签', async () => {
      const file = makeFile(
        JSON.stringify({
          version: '1.0.0',
          categories: [],
          bookmarks: [{ id: 'x', url: 'https://a.com' }],
        }),
      )
      await expect(parseJsonFile(file)).rejects.toThrow('字段缺失')
    })

    it('拒绝非字符串的 name/url', async () => {
      const file = makeFile(
        JSON.stringify({
          version: '1.0.0',
          categories: [],
          bookmarks: [
            {
              id: 'x',
              url: 'https://a.com',
              name: 123,
              icon: '',
              createdAt: '2026-01-01T00:00:00Z',
              lastVisitedAt: null,
              categoryId: null,
            },
          ],
        }),
      )
      await expect(parseJsonFile(file)).rejects.toThrow('字段缺失')
    })

    it('导入后生成新 ID 并写入 IndexedDB', async () => {
      const original = makeBookmark({ name: 'Original' })
      const exportData: ExportData = {
        version: '1.0.0',
        exportedAt: '2026-07-28T00:00:00Z',
        bookmarkCount: 1,
        categoryCount: 0,
        categories: [],
        bookmarks: [original],
      }
      const result = await importFromJson(exportData)
      expect(result.success).toBe(true)
      expect(result.bookmarkCount).toBe(1)

      const all = await getAllBookmarks()
      expect(all).toHaveLength(1)
      expect(all[0].id).not.toBe(original.id) // 新 ID
      expect(all[0].name).toBe('Original')
    })

    it('导入时跳过非 http/https URL', async () => {
      const exportData: ExportData = {
        version: '1.0.0',
        exportedAt: '2026-07-28T00:00:00Z',
        bookmarkCount: 2,
        categoryCount: 0,
        categories: [],
        bookmarks: [
          makeBookmark({ url: 'https://valid.com', name: 'Valid' }),
          makeBookmark({ url: 'javascript:alert(1)', name: 'Bad' }),
        ],
      }
      const result = await importFromJson(exportData)
      expect(result.success).toBe(true)
      expect(result.bookmarkCount).toBe(1)
      expect(result.skipped).toBe(1)
    })

    it('保留 categoryId 映射关系', async () => {
      const cat = makeCategory({ name: 'Work' })
      const exportData: ExportData = {
        version: '1.0.0',
        exportedAt: '2026-07-28T00:00:00Z',
        bookmarkCount: 1,
        categoryCount: 1,
        categories: [cat],
        bookmarks: [makeBookmark({ categoryId: cat.id, name: 'Bm' })],
      }
      const result = await importFromJson(exportData)
      expect(result.success).toBe(true)

      const cats = await getAllCategories()
      const bms = await getAllBookmarks()
      expect(bms[0].categoryId).toBe(cats[0].id) // 映射后指向新分类 ID
    })
  })

  describe('FR-016: HTML 导入', () => {
    const htmlContent = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
  <DT><H3>工作</H3>
  <DL><p>
    <DT><A HREF="https://github.com" ADD_DATE="1690000000">GitHub</A>
    <DT><A HREF="javascript:alert(1)">Bad</A>
  </DL><p>
  <DT><A HREF="https://google.com">Google</A>
  <DT><H3>嵌套</H3>
  <DL><p>
    <DT><A HREF="https://docs.example.com">Docs</A>
  </DL><p>
</DL><p>`

    function makeHtmlFile(content: string): File {
      return new File([content], 'bookmarks.html', { type: 'text/html' })
    }

    it('解析 HTML 提取分类和书签', async () => {
      const { preview, categories, bookmarks } = await parseHtmlFile(
        makeHtmlFile(htmlContent),
      )
      // 分类：工作、嵌套
      expect(categories).toHaveLength(2)
      expect(categories.map((c) => c.name)).toContain('工作')
      expect(categories.map((c) => c.name)).toContain('嵌套')
      // 书签：GitHub、Google、Docs（Bad 被跳过）
      expect(bookmarks).toHaveLength(3)
      expect(preview.skipped).toBe(1)
    })

    it('嵌套文件夹扁平化为一级分类', async () => {
      const { categories, bookmarks } = await parseHtmlFile(
        makeHtmlFile(htmlContent),
      )
      const nestedCat = categories.find((c) => c.name === '嵌套')
      const docsBm = bookmarks.find((b) => b.name === 'Docs')
      expect(docsBm?.categoryId).toBe(nestedCat?.id)
    })

    it('ADD_DATE 转换为 ISO 时间', async () => {
      const { bookmarks } = await parseHtmlFile(makeHtmlFile(htmlContent))
      const github = bookmarks.find((b) => b.name === 'GitHub')
      expect(github?.createdAt).toContain('2023') // 1690000000 ≈ 2023-07
    })

    it('空 HTML 抛出错误', async () => {
      await expect(parseHtmlFile(makeHtmlFile('<html></html>'))).rejects.toThrow(
        '未找到书签结构',
      )
    })

    it('导入 HTML 数据到 IndexedDB', async () => {
      const { categories, bookmarks } = await parseHtmlFile(
        makeHtmlFile(htmlContent),
      )
      const result = await importFromHtml(categories, bookmarks)
      expect(result.success).toBe(true)
      expect(result.bookmarkCount).toBe(3)
      expect(result.categoryCount).toBe(2)

      const dbCats = await getAllCategories()
      const dbBms = await getAllBookmarks()
      expect(dbCats).toHaveLength(2)
      expect(dbBms).toHaveLength(3)
    })
  })
})
