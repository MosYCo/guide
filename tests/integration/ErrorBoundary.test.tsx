import type { ReactNode } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function Boom(): ReactNode {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('渲染可恢复的兜底页面并调用 reload', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const reload = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload },
    })
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText('页面遇到错误')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
    expect(reload).toHaveBeenCalledTimes(1)
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })
})
