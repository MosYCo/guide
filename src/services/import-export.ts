/**
 * 导入导出服务
 * JSON 导出、HTML 导入、JSON 导入
 */

import { v4 as uuidv4 } from 'uuid'
import type { Bookmark, Category, ExportData, ImportPreview, ImportResult } from '@/types'
import { bulkImport, getAllBookmarks, getAllCategories, getAllDataForExport } from '@/services/db'
import { validateAndNormalizeUrl } from '@/utils/url'

const EXPORT_VERSION = '1.0.0'
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_ITEMS = 50_000
const MAX_HTML_DEPTH = 100

async function countDuplicateUrls(bookmarks: Bookmark[]): Promise<number> {
  const existing = await getAllBookmarks()
  const urls = new Set(
    existing.map((bookmark) => {
      const validation = validateAndNormalizeUrl(bookmark.url)
      return validation.valid ? validation.normalized! : bookmark.url
    }),
  )
  let duplicates = 0
  for (const bookmark of bookmarks) {
    const validation = validateAndNormalizeUrl(bookmark.url)
    if (validation.valid && urls.has(validation.normalized!)) duplicates++
  }
  return duplicates
}

/**
 * 按名称合并到现有分类:同名分类复用现有 ID,新分类 order 追加到现有 max 之后。
 * 书签的 categoryId 同步重映射,避免重复分类与 order 冲突。
 */
async function mergeCategoriesWithExisting(
  categories: Category[],
  bookmarks: Bookmark[],
): Promise<{ categories: Category[]; bookmarks: Bookmark[] }> {
  const existing = await getAllCategories()
  const byName = new Map(existing.map((category) => [category.name, category]))
  let nextOrder = existing.reduce((max, category) => Math.max(max, category.order), -1) + 1
  const idMap = new Map<string, string>()
  const merged: Category[] = []

  for (const category of categories) {
    const name = category.name.trim().slice(0, 50) || '未命名'
    const found = byName.get(name)
    if (found) {
      idMap.set(category.id, found.id)
      continue
    }
    const created: Category = { ...category, name, order: nextOrder++ }
    byName.set(name, created)
    merged.push(created)
    idMap.set(category.id, created.id)
  }

  return {
    categories: merged,
    bookmarks: bookmarks.map((bookmark) => ({
      ...bookmark,
      categoryId: bookmark.categoryId ? (idMap.get(bookmark.categoryId) ?? null) : null,
    })),
  }
}

/**
 * 兼容 Node/jsdom 环境读取文件文本。
 * jsdom 的 File 没有 .text，用 FileReader 兜底。
 */
function fileText(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    return Promise.reject(new Error('文件过大，最大支持 10 MB'))
  }
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'))
    reader.readAsText(file)
  })
}

/**
 * 导出所有书签和分类为 JSON（ExportData 格式）。
 * @returns ExportData 对象
 */
export async function exportToJson(): Promise<ExportData> {
  const { bookmarks, categories } = await getAllDataForExport()
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
  const name = filename ?? `bookmarks-${new Date().toISOString().slice(0, 10)}.json`
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
  // 立即 revoke 可能取消部分浏览器/大文件的下载,延后释放
  setTimeout(() => URL.revokeObjectURL(url), 1000)
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
  const majorVersion = Number(data.version.split('.')[0])
  if (!Number.isInteger(majorVersion) || majorVersion !== 1) {
    throw new Error(`不支持的导入版本：${data.version}`)
  }
  if (!Array.isArray(data.categories) || !Array.isArray(data.bookmarks)) {
    throw new Error('categories 或 bookmarks 不是有效数组')
  }
  if (data.categories.length > MAX_ITEMS || data.bookmarks.length > MAX_ITEMS) {
    throw new Error(`导入条目过多，单次最多 ${MAX_ITEMS} 条`)
  }
  for (const c of data.categories) {
    if (
      typeof c?.id !== 'string' ||
      !c.id ||
      typeof c?.name !== 'string' ||
      !c.name ||
      typeof c?.order !== 'number' ||
      !Number.isInteger(c.order) ||
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
    if (
      b.createdAt !== undefined &&
      (typeof b.createdAt !== 'string' || Number.isNaN(Date.parse(b.createdAt)))
    ) {
      throw new Error('书签数据字段缺失或类型错误')
    }
    if (
      b.lastVisitedAt !== undefined &&
      b.lastVisitedAt !== null &&
      (typeof b.lastVisitedAt !== 'string' || Number.isNaN(Date.parse(b.lastVisitedAt)))
    ) {
      throw new Error('书签数据字段缺失或类型错误')
    }
    if (b.categoryId !== undefined && b.categoryId !== null && typeof b.categoryId !== 'string') {
      throw new Error('书签数据字段缺失或类型错误')
    }
  }
}

/**
 * 解析 JSON 文件为预览数据（不写入）。
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
      duplicates: await countDuplicateUrls(data.bookmarks),
    },
    data,
  }
}

/**
 * 导入 JSON 数据（写入 IndexedDB）。
 * - 为新数据生成新 ID，避免冲突
 * - 导入前不自动备份（由调用方决定），失败时抛出错误
 * @param data 已解析的 ExportData
 */
export async function importFromJson(data: ExportData): Promise<ImportResult> {
  try {
    assertValidExportData(data)
    const now = new Date().toISOString()
    // 生成新 ID，构建 categoryId 映射
    const categoryIdMap = new Map<string, string>()
    const newCategories: Category[] = data.categories.map((c) => {
      const newId = uuidv4()
      categoryIdMap.set(c.id, newId)
      return {
        ...c,
        id: newId,
        name: c.name.trim().slice(0, 50) || '未命名',
        createdAt: c.createdAt ?? now,
      }
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
      const icon = /^(?:https?:\/\/|data:image\/)/.test(b.icon) ? b.icon : ''
      newBookmarks.push({
        ...b,
        id: uuidv4(),
        url: validation.normalized!,
        name: b.name.trim().slice(0, 100) || '未命名',
        icon,
        categoryId: b.categoryId ? (categoryIdMap.get(b.categoryId) ?? null) : null,
        createdAt: b.createdAt ?? now,
        lastVisitedAt: b.lastVisitedAt ?? null,
      })
    }

    const merged = await mergeCategoriesWithExisting(newCategories, newBookmarks)
    await bulkImport(merged.categories, merged.bookmarks)

    return {
      success: true,
      bookmarkCount: merged.bookmarks.length,
      categoryCount: merged.categories.length,
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
 * 解析浏览器书签 HTML 文件（Netscape Bookmark Format）。
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
  const categoryByName = new Map<string, Category>()
  let skipped = 0
  let categoryOrder = 0
  const now = new Date().toISOString()

  // 同名文件夹合并为一个分类;order 用全局计数器,避免每层从 0 重置
  const getCategory = (rawName: string | null): Category => {
    const name = (rawName ?? '').trim().slice(0, 50) || '未命名'
    const existing = categoryByName.get(name)
    if (existing) return existing
    if (categories.length >= MAX_ITEMS) {
      throw new Error(`分类过多，单次最多 ${MAX_ITEMS} 条`)
    }
    const category: Category = {
      id: uuidv4(),
      name,
      order: categoryOrder++,
      createdAt: now,
    }
    categories.push(category)
    categoryByName.set(name, category)
    return category
  }

  const parseAddDate = (value: string | null): string => {
    if (!value) return now
    const seconds = Number(value)
    if (!Number.isFinite(seconds)) return now
    const date = new Date(seconds * 1000)
    if (Number.isNaN(date.getTime())) return now
    const year = date.getUTCFullYear()
    return year >= 1990 && year <= 2100 ? date.toISOString() : now
  }

  // 递归遍历 <DL> 节点
  function walk(dl: Element, parentCategoryId: string | null, depth: number) {
    if (depth > MAX_HTML_DEPTH) {
      throw new Error('书签文件嵌套层级过深')
    }
    const items = Array.from(dl.children).filter((el) => el.tagName === 'DT' || el.tagName === 'dt')
    for (const dt of items) {
      const h3 = dt.querySelector(':scope > h3, :scope > H3')
      const a = dt.querySelector(':scope > a, :scope > A')
      const childDl = dt.querySelector(':scope > dl, :scope > DL')

      if (h3) {
        const category = getCategory(h3.textContent)
        if (childDl) walk(childDl, category.id, depth + 1)
      } else if (a) {
        if (bookmarks.length >= MAX_ITEMS) {
          throw new Error(`书签过多，单次最多 ${MAX_ITEMS} 条`)
        }
        const href = a.getAttribute('HREF') || a.getAttribute('href') || ''
        const validation = validateAndNormalizeUrl(href)
        if (!validation.valid) {
          skipped++
          continue
        }
        bookmarks.push({
          id: uuidv4(),
          url: validation.normalized!,
          name: (a.textContent ?? '').trim().slice(0, 100) || validation.domain || '未命名',
          icon: '',
          categoryId: parentCategoryId,
          createdAt: parseAddDate(a.getAttribute('ADD_DATE')),
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
      duplicates: await countDuplicateUrls(bookmarks),
    },
    categories,
    bookmarks,
  }
}

/**
 * 导入解析后的 HTML 书签数据。
 * 图标在导入时留空，由展示时 Favicon 服务兜底。
 */
export async function importFromHtml(
  categories: Category[],
  bookmarks: Bookmark[],
  skipped = 0,
): Promise<ImportResult> {
  try {
    const merged = await mergeCategoriesWithExisting(categories, bookmarks)
    await bulkImport(merged.categories, merged.bookmarks)
    return {
      success: true,
      bookmarkCount: merged.bookmarks.length,
      categoryCount: merged.categories.length,
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
