import { useEffect, useState } from 'react'

function readRootFontSize(): number {
  if (typeof window === 'undefined') return 16
  const value = parseFloat(getComputedStyle(document.documentElement).fontSize)
  return Number.isFinite(value) && value > 0 ? value : 16
}

/**
 * 读取根字号并跟随变化。
 * 虚拟列表的 px 常量必须与 Tailwind 的 rem 工具类同源,
 * 否则浏览器默认字号调大时会出现行重叠。
 */
export function useRootFontSize(): number {
  const [fontSize, setFontSize] = useState(readRootFontSize)

  useEffect(() => {
    const update = () => setFontSize(readRootFontSize())
    update()
    const observer = new ResizeObserver(update)
    observer.observe(document.documentElement)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  return fontSize
}
