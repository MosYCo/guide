/**
 * 导入导出服务
 * FR-015 JSON 导出、FR-016 HTML 导入、FR-018 JSON 导入
 * @see specs/001-bookmark-navigation/data-model.md §数据导入导出格式
 * @see specs/001-bookmark-navigation/research.md §3, §4
 */

import { v4 as uuidv4 } from 'uuid'
import type { Bookmark, Category, ExportData, ImportPreview, ImportResult } from '@/types'
import {
  bulkImport,
  getAllBookmarks,
  getAllCategories,
} from '@/services/db'
import { validateAndNormalizeUrl } from '@/utils/url'

const EXPORT_VERSION = '1.0.0'

/**
 * 兼容 Node/jsdom 环境读取文件文本。
 * jsdom 的 File 没有 .text()，用 FileReader 兜底。
 */
function fileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'))
    reader.readAsText(file)
  })
}

/**
 * FR-015: 导出所有书签和分类为 JSON（ExportData 格式）。
 * @returns ExportData 对象
 */
export async function exportToJson(): Promise<ExportData> {
  const [bookmarks, categories] = await Promise.all([
    getAllBookmarks(),
    getAllCategories(),
  ])
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    bookmarkCount: bookmarks.length,
    categoryCount: categories.length,
    categories,
    bookmarks,
  }
}

/**
 * 触发浏览器下载 JSON 文件。
 * @param data ExportData 对象
 * @param filename 文件名（可选，默认 bookmarks-YYYY-MM-DD.json）
 */
export function downloadJson(data: ExportData, filename?: string): void {
  const name =
    filename ?? `bookmarks-${new Date().toISOString().slice(0, 10)}.json`
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  triggerDownload(blob, name)
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 严格校验导入结构。非字符串 name/url/id 会在渲染、搜索时抛 TypeError,
 * 必须在写库前拒绝,否则坏数据会持久化并让应用反复进入错误页。
 */
function assertValidExportData(data: ExportData): void {
  if (!data || typeof data !== 'object') {
    throw new Error('文件内容不是有效的 JSON 对象')
  }
  if (typeof data.version !== 'string') {
    throw new Error('缺少 version 字段或格式不正确')
  }
  if (!Array.isArray(data.categories) || !Array.isArray(data.bookmarks)) {
    throw new Error('categories 或 bookmarks 不是有效数组')
  }
  for (const c of data.categories) {
    if (
      typeof c?.id !== 'string' ||
      !c.id ||
      typeof c?.name !== 'string' ||
      !c.name ||
      typeof c?.order !== 'number' ||
      !Number.isFinite(c.order) ||
      c.order < 0
    ) {
      throw new Error('分类数据字段缺失或类型错误')
    }
  }
  for (const b of data.bookmarks) {
    if (
      typeof b?.id !== 'string' ||
      !b.id ||
      typeof b?.url !== 'string' ||
      !b.url ||
      typeof b?.name !== 'string' ||
      !b.name ||
      typeof b?.icon !== 'string'
    ) {
      throw new Error('书签数据字段缺失或类型错误')
    }
    if (b.createdAt !== undefined && typeof b.createdAt !== 'string') {
      throw new Error('书签数据字段缺失或类型错误')
    }
    if (
      b.lastVisitedAt !== undefined &&
      b.lastVisitedAt !== null &&
      typeof b.lastVisitedAt !== 'string'
    ) {
      throw new Error('书签数据字段缺失或类型错误')
    }
    if (
      b.categoryId !== undefined &&
      b.categoryId !== null &&
      typeof b.categoryId !== 'string'
    ) {
      throw new Error('书签数据字段缺失或类型错误')
    }
  }
}

/**
 * FR-018: 解析 JSON 文件为预览数据（不写入）。
 * 校验版本和字段结构。
 * @throws 格式错误时抛出
 */
export async function parseJsonFile(file: File): Promise<{
  preview: ImportPreview
  data: ExportData
}> {
  const text = await fileText(file)
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('JSON 格式错误，无法解析')
  }

  const data = parsed as ExportData
  assertValidExportData(data)

  let skipped = 0
  for (const b of data.bookmarks) {
    // 预览阶段就按导入规则统计将被跳过的非 http/https 书签
    if (!validateAndNormalizeUrl(b.url).valid) skipped++
  }

  return {
    preview: {
      bookmarks: data.bookmarks.length,
      categories: data.categories.length,
      skipped,
    },
    data,
  }
}

/**
 * FR-018: 导入 JSON 数据（写入 IndexedDB）。
 * - 为新数据生成新 ID，避免冲突
 * - 导入前不自动备份（由调用方决定），失败时抛出错误
 * @param data 已解析的 ExportData
 */
export async function importFromJson(data: ExportData): Promise<ImportResult> {
  try {
    assertValidExportData(data)
    // 生成新 ID，构建 categoryId 映射
    const categoryIdMap = new Map<string, string>()
    const newCategories: Category[] = data.categories.map((c) => {
      const newId = uuidv4()
      categoryIdMap.set(c.id, newId)
      return { ...c, id: newId }
    })

    const newBookmarks: Bookmark[] = []
    let skipped = 0
    for (const b of data.bookmarks) {
      // 重新验证 URL（仅 http/https）
      const validation = validateAndNormalizeUrl(b.url)
      if (!validation.valid) {
        skipped++
        continue
      }
      newBookmarks.push({
        ...b,
        id: uuidv4(),
        url: validation.normalized!,
        categoryId: b.categoryId ? categoryIdMap.get(b.categoryId) ?? null : null,
      })
    }

    await bulkImport(newCategories, newBookmarks)

    return {
      success: true,
      bookmarkCount: newBookmarks.length,
      categoryCount: newCategories.length,
      skipped,
    }
  } catch (e) {
    return {
      success: false,
      bookmarkCount: 0,
      categoryCount: 0,
      skipped: 0,
      error: e instanceof Error ? e.message : '导入失败',
    }
  }
}

/**
 * FR-016: 解析浏览器书签 HTML 文件（Netscape Bookmark Format）。
 * - 嵌套文件夹扁平化为一级分类
 * - 跳过非 http/https URL
 * @returns 预览数据 + 解析后的分类和书签
 */
export async function parseHtmlFile(file: File): Promise<{
  preview: ImportPreview
  categories: Category[]
  bookmarks: Bookmark[]
}> {
  const text = await fileText(file)
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/html')

  const categories: Category[] = []
  const bookmarks: Bookmark[] = []
  let skipped = 0
  const now = new Date().toISOString()

  // 递归遍历 <DL> 节点
  function walk(dl: Element, parentCategoryId: string | null, order: number) {
    const items = Array.from(dl.children).filter(
      (el) => el.tagName === 'DT' || el.tagName === 'dt',
    )
    let catOrder = order
    for (const dt of items) {
      const h3 = dt.querySelector(':scope > h3, :scope > H3')
      const a = dt.querySelector(':scope > a, :scope > A')
      const childDl = dt.querySelector(':scope > dl, :scope > DL')

      if (h3) {
        // 文件夹 → 分类
        const catId = uuidv4()
        categories.push({
          id: catId,
          name: h3.textContent || '未命名',
          order: catOrder++,
          createdAt: now,
        })
        if (childDl) walk(childDl, catId, 0)
      } else if (a) {
        // 书签
        const href = a.getAttribute('HREF') || a.getAttribute('href') || ''
        const validation = validateAndNormalizeUrl(href)
        if (!validation.valid) {
          skipped++
          continue
        }
        const addDate = a.getAttribute('ADD_DATE')
        bookmarks.push({
          id: uuidv4(),
          url: validation.normalized!,
          name: a.textContent || validation.domain || '未命名',
          icon: '',
          categoryId: parentCategoryId,
          createdAt: addDate
            ? new Date(Number(addDate) * 1000).toISOString()
            : now,
          lastVisitedAt: null,
        })
      }
    }
  }

  const rootDl = doc.querySelector('dl, DL')
  if (!rootDl) {
    throw new Error('HTML 文件中未找到书签结构（<DL>）')
  }
  walk(rootDl, null, 0)

  return {
    preview: {
      bookmarks: bookmarks.length,
      categories: categories.length,
      skipped,
    },
    categories,
    bookmarks,
  }
}

/**
 * FR-016: 导入解析后的 HTML 书签数据。
 * 图标在导入时留空，由展示时 Favicon 服务兜底。
 */
export async function importFromHtml(
  categories: Category[],
  bookmarks: Bookmark[],
): Promise<ImportResult> {
  try {
    await bulkImport(categories, bookmarks)
    return {
      success: true,
      bookmarkCount: bookmarks.length,
      categoryCount: categories.length,
      skipped: 0,
    }
  } catch (e) {
    return {
      success: false,
      bookmarkCount: 0,
      categoryCount: 0,
      skipped: 0,
      error: e instanceof Error ? e.message : '导入失败',
    }
  }
}
