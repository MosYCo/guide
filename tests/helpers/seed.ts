/**
 * 测试夹具辅助:500+ 书签数据集注入
 * T025: 性能基线验收(SC-004)与极端字段测试(SC-006)共用
 */

import type { Bookmark, Category, ExportData } from '@/types'
import fixture from '../fixtures/500-bookmarks.json'

/** 500+ 书签测试数据集(含极端字段样本) */
export function getSeedBookmarks(): Bookmark[] {
  return fixture.bookmarks as Bookmark[]
}

/** 配套分类数据 */
export function getSeedCategories(): Category[] {
  return fixture.categories as Category[]
}

/** 完整导出数据(供导入测试) */
export function getSeedExportData(): ExportData {
  return fixture as unknown as ExportData
}
