import { describe, it, expect } from 'vitest'
import { validateAndNormalizeUrl, extractDomain, displayDomain, getFaviconUrl } from '@/utils/url'

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

    it('裸 host:port 不被误判为协议', () => {
      const local = validateAndNormalizeUrl('localhost:3000')
      expect(local.valid).toBe(true)
      expect(local.normalized).toBe('http://localhost:3000/')

      const remote = validateAndNormalizeUrl('example.com:8080')
      expect(remote.valid).toBe(true)
      expect(remote.normalized).toBe('https://example.com:8080/')
    })

    it('接受单标签内网主机与 IPv6', () => {
      expect(validateAndNormalizeUrl('nas:5000').valid).toBe(true)
      const ipv6 = validateAndNormalizeUrl('http://[::1]:8080')
      expect(ipv6.valid).toBe(true)
      expect(ipv6.domain).toBe('[::1]')
    })
  })

  describe('extractDomain', () => {
    it('提取域名', () => {
      expect(extractDomain('https://example.com/path')).toBe('example.com')
    })
    it('无效输入返回空字符串', () => {
      expect(extractDomain('javascript:alert(1)')).toBe('')
    })
    it('IDN 的请求形式保持 punycode', () => {
      expect(extractDomain('https://例子.测试')).toBe('xn--fsqu00a.xn--0zwm56d')
    })
  })

  describe('displayDomain', () => {
    it('IDN 展示为 Unicode', () => {
      expect(displayDomain('https://例子.测试')).toBe('例子.测试')
      expect(displayDomain('https://xn--fsqu00a.xn--0zwm56d')).toBe('例子.测试')
    })
  })

  describe('getFaviconUrl', () => {
    it('生成 Google Favicon API URL', () => {
      const url = getFaviconUrl('example.com')
      expect(url).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=32')
    })
    it('对域名做 URL 编码', () => {
      const url = getFaviconUrl('ex ample.com')
      expect(url).toContain('ex%20ample.com')
    })
  })
})
