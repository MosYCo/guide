import type { Bookmark } from './types'

export const BOOKMARK_STORAGE_KEY = 'guide_bookmarks'
export const COLLAPSED_STORAGE_KEY = 'guide_collapsed_categories'
export const CATEGORY_STORAGE_KEY = 'guide_categories'
export const DELETED_CATEGORIES_STORAGE_KEY = 'guide_deleted_categories'
export const BOOKMARK_EXPORT_VERSION = 2
export const UNCATEGORIZED_CATEGORY = '未分类'

export const CATEGORY_ORDER: Record<string, number> = {
  开发: 0,
  AI: 1,
  设计: 2,
  工具: 3,
  社区: 4,
  日常: 5,
}

export const CATEGORY_COLORS: Record<string, string> = {
  开发: 'var(--c-dev)',
  AI: 'var(--c-ai)',
  设计: 'var(--c-design)',
  工具: 'var(--c-tools)',
  社区: 'var(--c-comm)',
  日常: 'var(--c-life)',
}

export const DEFAULT_BOOKMARKS: Bookmark[] = [
  { id: 'g1', title: 'GitHub', url: 'https://github.com', cat: '开发', icon: '', faviconUrl: '', pin: true },
  { id: 'g2', title: 'Stack Overflow', url: 'https://stackoverflow.com', cat: '开发', icon: '', faviconUrl: '', pin: false },
  { id: 'g3', title: 'MDN', url: 'https://developer.mozilla.org', cat: '开发', icon: '', faviconUrl: '', pin: false },
  { id: 'g4', title: 'npm', url: 'https://www.npmjs.com', cat: '开发', icon: '', faviconUrl: '', pin: false },
  { id: 'g5', title: 'VS Code Web', url: 'https://vscode.dev', cat: '开发', icon: '', faviconUrl: '', pin: false },
  { id: 'g6', title: 'TypeScript', url: 'https://www.typescriptlang.org', cat: '开发', icon: '', faviconUrl: '', pin: false },
  { id: 'g7', title: 'Vercel', url: 'https://vercel.com', cat: '开发', icon: '', faviconUrl: '', pin: true },
  { id: 'g8', title: 'Railway', url: 'https://railway.app', cat: '开发', icon: '', faviconUrl: '', pin: false },
  { id: 'a1', title: 'ChatGPT', url: 'https://chat.openai.com', cat: 'AI', icon: '', faviconUrl: '', pin: true },
  { id: 'a2', title: 'Claude', url: 'https://claude.ai', cat: 'AI', icon: '', faviconUrl: '', pin: true },
  { id: 'a3', title: 'Hugging Face', url: 'https://huggingface.co', cat: 'AI', icon: '', faviconUrl: '', pin: false },
  { id: 'a4', title: 'Midjourney', url: 'https://www.midjourney.com', cat: 'AI', icon: '', faviconUrl: '', pin: false },
  { id: 'a5', title: 'Replicate', url: 'https://replicate.com', cat: 'AI', icon: '', faviconUrl: '', pin: false },
  { id: 'd1', title: 'Figma', url: 'https://www.figma.com', cat: '设计', icon: '', faviconUrl: '', pin: true },
  { id: 'd2', title: 'Dribbble', url: 'https://dribbble.com', cat: '设计', icon: '', faviconUrl: '', pin: false },
  { id: 'd3', title: 'Google Fonts', url: 'https://fonts.google.com', cat: '设计', icon: '', faviconUrl: '', pin: false },
  { id: 'd4', title: 'Coolors', url: 'https://coolors.co', cat: '设计', icon: '', faviconUrl: '', pin: false },
  { id: 't1', title: 'Notion', url: 'https://www.notion.so', cat: '工具', icon: '', faviconUrl: '', pin: true },
  { id: 't2', title: 'Excalidraw', url: 'https://excalidraw.com', cat: '工具', icon: '', faviconUrl: '', pin: false },
  { id: 't3', title: 'JSON Formatter', url: 'https://jsonformatter.org', cat: '工具', icon: '', faviconUrl: '', pin: false },
  { id: 't4', title: 'Regex101', url: 'https://regex101.com', cat: '工具', icon: '', faviconUrl: '', pin: false },
  { id: 't5', title: 'Can I Use', url: 'https://caniuse.com', cat: '工具', icon: '', faviconUrl: '', pin: false },
  { id: 't6', title: 'TinyPNG', url: 'https://tinypng.com', cat: '工具', icon: '', faviconUrl: '', pin: false },
  { id: 'c1', title: 'V2EX', url: 'https://www.v2ex.com', cat: '社区', icon: '', faviconUrl: '', pin: false },
  { id: 'c2', title: 'Hacker News', url: 'https://news.ycombinator.com', cat: '社区', icon: '', faviconUrl: '', pin: false },
  { id: 'c3', title: 'Product Hunt', url: 'https://www.producthunt.com', cat: '社区', icon: '', faviconUrl: '', pin: false },
  { id: 'c4', title: '掘金', url: 'https://juejin.cn', cat: '社区', icon: '', faviconUrl: '', pin: false },
  { id: 'r1', title: 'YouTube', url: 'https://www.youtube.com', cat: '日常', icon: '', faviconUrl: '', pin: true },
  { id: 'r2', title: 'Bilibili', url: 'https://www.bilibili.com', cat: '日常', icon: '', faviconUrl: '', pin: false },
  { id: 'r3', title: 'X (Twitter)', url: 'https://x.com', cat: '日常', icon: '', faviconUrl: '', pin: false },
  { id: 'r4', title: '微信读书', url: 'https://weread.qq.com', cat: '日常', icon: '', faviconUrl: '', pin: false },
  { id: 'r5', title: 'Spotify', url: 'https://open.spotify.com', cat: '日常', icon: '', faviconUrl: '', pin: false },
]
