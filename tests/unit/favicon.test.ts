import { describe, it, expect } from 'vitest'
import { getLetterIcon } from '@/services/favicon'

describe('favicon 降级图标', () => {
  it('emoji 与增补平面字符不会触发 URIError', () => {
    expect(() => getLetterIcon('🔖 书签')).not.toThrow()
    expect(() => getLetterIcon('𠮷野家')).not.toThrow()
    expect(getLetterIcon('🔖')).toMatch(/^data:image\/svg\+xml,/)
  })

  it('未配对代理项会降级到纯色块而不是抛错', () => {
    expect(() => getLetterIcon('\uD800oops')).not.toThrow()
    expect(getLetterIcon('\uD800oops')).toMatch(/^data:image\/svg\+xml,/)
  })

  it('空白名称回退为 ?', () => {
    expect(getLetterIcon('   ')).toContain('%3F')
  })
})
