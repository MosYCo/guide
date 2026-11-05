import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCategories } from '@/hooks/useCategories'
import { _resetDBForTesting, getDB } from '@/services/db'

describe('useCategories Hook + db', () => {
  beforeEach(async () => {
    _resetDBForTesting()
    const db = await getDB()
    await db.clear('categories')
    await db.clear('bookmarks')
  })

  it('创建分类并读取', async () => {
    const { result } = renderHook(() => useCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addCategory('工作')
    })
    expect(result.current.categories).toHaveLength(1)
    expect(result.current.categories[0].name).toBe('工作')
    expect(result.current.categories[0].order).toBe(0)
  })

  it('拒绝重复名称', async () => {
    const { result } = renderHook(() => useCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addCategory('工作')
    })
    await expect(
      act(async () => {
        await result.current.addCategory('工作')
      }),
    ).rejects.toThrow('已存在')
  })

  it('创建和更新分类图标', async () => {
    const { result } = renderHook(() => useCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addCategory('工作', 'https://example.com/work.png')
    })
    const id = result.current.categories[0].id
    expect(result.current.categories[0].icon).toBe('https://example.com/work.png')

    // 仅改图标,名称不变
    await act(async () => {
      await result.current.updateCategory(id, '工作', 'https://example.com/office.png')
    })
    expect(result.current.categories[0].icon).toBe('https://example.com/office.png')

    // 空字符串清除图标
    await act(async () => {
      await result.current.updateCategory(id, '工作', '')
    })
    expect(result.current.categories[0].icon).toBeUndefined()
  })

  it('编辑名称（名称唯一性校验）', async () => {
    const { result } = renderHook(() => useCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addCategory('工作')
    })
    const id = result.current.categories[0].id

    await act(async () => {
      await result.current.updateCategory(id, '办公')
    })
    expect(result.current.categories[0].name).toBe('办公')
  })

  it('编辑拒绝重复名称', async () => {
    const { result } = renderHook(() => useCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addCategory('A')
    })
    await act(async () => {
      await result.current.addCategory('B')
    })
    const idA = result.current.categories.find((c) => c.name === 'A')!.id

    await expect(
      act(async () => {
        await result.current.updateCategory(idA, 'B')
      }),
    ).rejects.toThrow('已存在')
  })

  it('删除分类后列表更新', async () => {
    const { result } = renderHook(() => useCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addCategory('工作')
    })
    const id = result.current.categories[0].id

    await act(async () => {
      await result.current.deleteCategory(id)
    })
    expect(result.current.categories).toHaveLength(0)
  })

  it('按 order 排序', async () => {
    const { result } = renderHook(() => useCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addCategory('B')
    })
    await act(async () => {
      await result.current.addCategory('A')
    })
    // 按 order 排序：B(0), A(1)
    expect(result.current.categories.map((c) => c.name)).toEqual(['B', 'A'])
  })
})
