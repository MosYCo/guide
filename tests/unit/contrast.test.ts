import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

type Rgb = [number, number, number]

function parseHsl(value: string): Rgb {
  const match = value.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/)
  if (!match) throw new Error(`无法解析 HSL token: ${value}`)
  const [h, s, l] = match.slice(1).map(Number)
  const saturation = s / 100
  const lightness = l / 100
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lightness - chroma / 2
  let rgb: [number, number, number]
  if (h < 60) rgb = [chroma, x, 0]
  else if (h < 120) rgb = [x, chroma, 0]
  else if (h < 180) rgb = [0, chroma, x]
  else if (h < 240) rgb = [0, x, chroma]
  else if (h < 300) rgb = [x, 0, chroma]
  else rgb = [chroma, 0, x]
  return rgb.map((channel) => Math.round((channel + m) * 255)) as Rgb
}

function luminance([r, g, b]: Rgb): number {
  const linear = (value: number) => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

function contrast(a: Rgb, b: Rgb): number {
  const first = luminance(a)
  const second = luminance(b)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

function extractVars(css: string, selector: string): Record<string, string> {
  const block = css.match(new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? ''
  const vars: Record<string, string> = {}
  for (const match of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    vars[`--${match[1]}`] = match[2].trim()
  }
  return vars
}

const root = process.cwd()
const indexCss = readFileSync(resolve(root, 'src/index.css'), 'utf8')
const tokensCss = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8')

const light = {
  ...extractVars(indexCss, ':root'),
  ...extractVars(tokensCss, ':root'),
}
const dark = {
  ...extractVars(indexCss, '.dark'),
  ...extractVars(tokensCss, '.dark'),
}

function expectRatio(
  vars: Record<string, string>,
  foreground: string,
  background: string,
  minimum: number,
) {
  const actual = contrast(parseHsl(vars[foreground]), parseHsl(vars[background]))
  expect(actual, `${foreground} on ${background}`).toBeGreaterThanOrEqual(minimum)
}

describe('主题 token WCAG 对比度', () => {
  it('亮色正文/按钮/焦点环达到 AA', () => {
    for (const pair of [
      ['--foreground', '--background', 4.5],
      ['--primary-foreground', '--primary', 4.5],
      ['--primary', '--background', 4.5],
      ['--destructive-foreground', '--destructive', 4.5],
      ['--destructive', '--background', 4.5],
      ['--warning', '--background', 4.5],
      ['--warning-foreground', '--warning', 4.5],
      ['--success', '--background', 4.5],
      ['--info', '--background', 4.5],
      ['--muted-foreground', '--background', 4.5],
      ['--ring', '--background', 3],
    ] as const) {
      expectRatio(light, pair[0], pair[1], pair[2])
    }
  })

  it('暗色正文/按钮/焦点环达到 AA', () => {
    for (const pair of [
      ['--foreground', '--background', 4.5],
      ['--primary-foreground', '--primary', 4.5],
      ['--primary', '--background', 4.5],
      ['--destructive-foreground', '--destructive', 4.5],
      ['--destructive', '--background', 4.5],
      ['--warning', '--background', 4.5],
      ['--warning-foreground', '--warning', 4.5],
      ['--success', '--background', 4.5],
      ['--info', '--background', 4.5],
      ['--muted-foreground', '--background', 4.5],
      ['--ring', '--background', 3],
    ] as const) {
      expectRatio(dark, pair[0], pair[1], pair[2])
    }
  })
})
