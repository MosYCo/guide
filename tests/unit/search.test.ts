import { describe, it, expect } from 'vitest'
import { filterBookmarks } from '@/utils/search'
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
]

describe('搜索过滤', () => {
  it('空查询返回全部', () => {
    expect(filterBookmarks(data, '')).toHaveLength(4)
    expect(filterBookmarks(data, '   ')).toHaveLength(4)
  })

  it('按名称匹配（不区分大小写）', () => {
    const r = filterBookmarks(data, 'git')
    expect(r).toHaveLength(2)
    expect(r.map((b) => b.name).sort()).toEqual(['GitHub', 'GitLab'])
  })

  it('按 URL 匹配', () => {
    const r = filterBookmarks(data, 'github.com')
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe('GitHub')
  })

  it('按名称中文匹配', () => {
    const r = filterBookmarks(data, '文档')
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe('文档站点')
  })

  it('无匹配返回空数组', () => {
    expect(filterBookmarks(data, 'nomatch')).toHaveLength(0)
  })

  it('部分 URL 路径匹配', () => {
    const r = filterBookmarks(data, 'repo')
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe('GitHub')
  })
})
