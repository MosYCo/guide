import { describe, it, expect } from 'vitest'
import { searchBookmarks } from '@/utils/search'
import type { Bookmark } from '@/types'

function makeBookmark(over: Partial<Bookmark> = {}): Bookmark {
  return {
    id: crypto.randomUUID(),
    url: 'https://example.com',
    name: 'Example',
    icon: 'icon',
    categoryId: null,
    createdAt: new Date().toISOString(),
    lastVisitedAt: null,
    ...over,
  }
}

const data: Bookmark[] = [
  makeBookmark({ name: 'GitHub', url: 'https://github.com/repo' }),
  makeBookmark({ name: 'Google', url: 'https://google.com' }),
  makeBookmark({ name: 'GitLab', url: 'https://gitlab.com' }),
  makeBookmark({ name: '文档站点', url: 'https://docs.example.com' }),
  // 例子.测试 的 punycode
  makeBookmark({ name: '中文域名', url: 'https://xn--fsqu00a.xn--0zwm56d' }),
  makeBookmark({ name: 'Café', url: 'https://cafe.example.com' }),
]

describe('搜索过滤', () => {
  it('空查询返回全部', () => {
    expect(searchBookmarks(data, '')).toHaveLength(6)
    expect(searchBookmarks(data, '   ')).toHaveLength(6)
    expect(searchBookmarks(data, '', { limit: 2 })).toHaveLength(2)
  })

  it('按名称匹配（不区分大小写）', () => {
    const r = searchBookmarks(data, 'git')
    expect(r).toHaveLength(2)
    expect(r.map((b) => b.name).sort()).toEqual(['GitHub', 'GitLab'])
  })

  it('按 URL 匹配', () => {
    const r = searchBookmarks(data, 'github.com')
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe('GitHub')
  })

  it('按名称中文匹配', () => {
    const r = searchBookmarks(data, '文档')
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe('文档站点')
  })

  it('无匹配返回空数组', () => {
    expect(searchBookmarks(data, 'nomatch')).toHaveLength(0)
  })

  it('部分 URL 路径匹配', () => {
    const r = searchBookmarks(data, 'repo')
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe('GitHub')
  })

  it('全角输入经 NFKC 归一化', () => {
    const r = searchBookmarks(data, 'ＧｉｔＨｕｂ')
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe('GitHub')
  })

  it('多 token 做 AND 匹配', () => {
    const r = searchBookmarks(data, 'git hub')
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe('GitHub')
  })

  it('去除重音匹配', () => {
    const r = searchBookmarks(data, 'cafe')
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe('Café')
  })

  it('中文域名可搜索 punycode URL', () => {
    const r = searchBookmarks(data, '例子.测试')
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe('中文域名')
  })
})
