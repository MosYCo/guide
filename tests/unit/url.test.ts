import { describe, it, expect } from 'vitest'
import { validateAndNormalizeUrl, extractDomain, getFaviconUrl } from '@/utils/url'

describe('URL 工具函数', () => {
  describe('validateAndNormalizeUrl', () => {
    it('接受有效 http URL', () => {
      const r = validateAndNormalizeUrl('http://example.com')
      expect(r.valid).toBe(true)
      expect(r.normalized).toBe('http://example.com/')
      expect(r.domain).toBe('example.com')
    })

    it('接受有效 https URL', () => {
      const r = validateAndNormalizeUrl('https://github.com/repo')
      expect(r.valid).toBe(true)
      expect(r.domain).toBe('github.com')
    })

    it('无协议头时自动补全为 https', () => {
      const r = validateAndNormalizeUrl('example.com')
      expect(r.valid).toBe(true)
      expect(r.normalized).toBe('https://example.com/')
    })

    it('小写化域名', () => {
      const r = validateAndNormalizeUrl('HTTPS://EXAMPLE.COM/Path')
      expect(r.valid).toBe(true)
      expect(r.domain).toBe('example.com')
    })

    it('拒绝 javascript: 协议', () => {
      const r = validateAndNormalizeUrl('javascript:alert(1)')
      expect(r.valid).toBe(false)
      expect(r.error).toContain('http/https')
    })

    it('拒绝 data: 协议', () => {
      const r = validateAndNormalizeUrl('data:text/html,<script>alert(1)</script>')
      expect(r.valid).toBe(false)
      expect(r.error).toContain('http/https')
    })

    it('拒绝 file: 协议', () => {
      const r = validateAndNormalizeUrl('file:///etc/passwd')
      expect(r.valid).toBe(false)
    })

    it('拒绝空输入', () => {
      expect(validateAndNormalizeUrl('').valid).toBe(false)
      expect(validateAndNormalizeUrl('   ').valid).toBe(false)
    })

    it('拒绝格式无效的 URL', () => {
      expect(validateAndNormalizeUrl('https://').valid).toBe(false)
      expect(validateAndNormalizeUrl('not a url at all').valid).toBe(false)
    })

    it('接受 localhost', () => {
      const r = validateAndNormalizeUrl('http://localhost:3000')
      expect(r.valid).toBe(true)
      expect(r.domain).toBe('localhost')
    })
  })

  describe('extractDomain', () => {
    it('提取域名', () => {
      expect(extractDomain('https://example.com/path')).toBe('example.com')
    })
    it('无效输入返回空字符串', () => {
      expect(extractDomain('javascript:alert(1)')).toBe('')
    })
  })

  describe('getFaviconUrl', () => {
    it('生成 Google Favicon API URL', () => {
      const url = getFaviconUrl('example.com')
      expect(url).toBe(
        'https://www.google.com/s2/favicons?domain=example.com&sz=32',
      )
    })
    it('对域名做 URL 编码', () => {
      const url = getFaviconUrl('ex ample.com')
      expect(url).toContain('ex%20ample.com')
    })
  })
})
