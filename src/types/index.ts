/**
 * 书签导航页 - 核心类型定义
 */

/** 书签实体 */
export interface Bookmark {
  /** 系统生成的唯一 ID (UUID v4) */
  id: string
  /** 网站 URL（允许重复），仅限 http/https，保存时规范化 */
  url: string
  /** 书签名称（用户自定义），1-100 字符 */
  name: string
  /** 图标 URL（用户上传或 Google Favicon API 解析结果），保存后必有值 */
  icon: string
  /** 所属分类 ID（可为空，归入"未分类"） */
  categoryId: string | null
  /** 创建时间 (ISO 8601) */
  createdAt: string
  /** 最后访问时间 (ISO 8601)，未访问时为 null */
  lastVisitedAt: string | null
  /** 置顶时间 (ISO 8601)，未置顶或旧数据可缺省 */
  pinnedAt?: string | null
}

/** 分类实体 */
export interface Category {
  /** 系统生成的唯一 ID (UUID v4) */
  id: string
  /** 分类名称（用户自定义），1-50 字符，同层级内唯一 */
  name: string
  /** 排序位置（从 0 开始，非负整数） */
  order: number
  /** 创建时间 (ISO 8601) */
  createdAt: string
}

/** 书签表单数据（添加/编辑时使用） */
export interface BookmarkFormData {
  url: string
  name: string
  icon?: string
  categoryId?: string | null
}

/** JSON 导入导出格式（与 data-model.md ExportData 一致） */
export interface ExportData {
  /** 格式版本号，当前 "1.0.0" */
  version: string
  /** 导出时间 (ISO 8601) */
  exportedAt: string
  /** 书签数量 */
  bookmarkCount: number
  /** 分类数量 */
  categoryCount: number
  /** 分类列表 */
  categories: Category[]
  /** 书签列表 */
  bookmarks: Bookmark[]
}

/** 主题模式 */
export type Theme = 'light' | 'dark' | 'system'

/** 解析后的主题（实际生效值） */
export type ResolvedTheme = 'light' | 'dark'

/** URL 验证结果 */
export interface UrlValidationResult {
  valid: boolean
  /** 规范化后的 URL（valid 为 true 时有值） */
  normalized?: string
  /** 域名（valid 为 true 时有值） */
  domain?: string
  /** 错误原因（valid 为 false 时有值） */
  error?: string
}

/** 导入结果 */
export interface ImportResult {
  /** 是否成功 */
  success: boolean
  /** 导入的书签数量 */
  bookmarkCount: number
  /** 导入的分类数量 */
  categoryCount: number
  /** 跳过的数量（非 http/https 等） */
  skipped: number
  /** 错误信息（失败时有值） */
  error?: string
}

/** 导入预览数据 */
export interface ImportPreview {
  bookmarks: number
  categories: number
  skipped: number
  /** 与现有库中 URL 重复的条数(仅提示,不阻止导入) */
  duplicates?: number
}
