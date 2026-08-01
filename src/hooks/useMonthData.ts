import { useMemo } from 'react'
import { useApp } from './useApp'
import { dateKey, dayjs } from '@/lib/format'
import { useTransactions } from '@/lib/queries'
import { useUI } from '@/lib/store'
import type { Transaction } from '@/lib/types'

export interface CategorySlice {
  categoryId: string
  name: string
  icon: string
  color: string
  total: number
  count: number
  share: number
}

/**
 * Du lieu cua thang dang xem, da ap dung bo loc thanh vien.
 * Chuyen khoan giua 2 vi khong duoc tinh la thu hay chi.
 */
export function useMonthData() {
  const { month, member } = useUI()
  const { categoryById } = useApp()

  const from = dateKey(dayjs(month).startOf('month'))
  const to = dateKey(dayjs(month).endOf('month'))
  const query = useTransactions(from, to)

  const all = useMemo(() => query.data ?? [], [query.data])

  const rows = useMemo(
    () => (member === 'all' ? all : all.filter((t) => t.payer_id === member)),
    [all, member],
  )

  const stats = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of rows) {
      if (t.type === 'income') income += t.amount
      else if (t.type === 'expense') expense += t.amount
    }
    return { income, expense, net: income - expense }
  }, [rows])

  const byCategory = useMemo<CategorySlice[]>(() => {
    const map = new Map<string, { total: number; count: number }>()
    let total = 0
    for (const t of rows) {
      if (t.type !== 'expense' || !t.category_id) continue
      const cur = map.get(t.category_id) ?? { total: 0, count: 0 }
      cur.total += t.amount
      cur.count += 1
      map.set(t.category_id, cur)
      total += t.amount
    }
    return [...map.entries()]
      .map(([categoryId, v]) => {
        const c = categoryById(categoryId)
        return {
          categoryId,
          name: c?.name ?? 'Khác',
          icon: c?.icon ?? '📦',
          color: c?.color ?? '#8595ae',
          total: v.total,
          count: v.count,
          share: total ? (v.total / total) * 100 : 0,
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [rows, categoryById])

  /** Chi tieu chung do tung nguoi ung ra - dung de can doi giua vo & chong. */
  const sharedByPayer = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of all) {
      if (t.type !== 'expense' || !t.is_shared) continue
      map.set(t.payer_id, (map.get(t.payer_id) ?? 0) + t.amount)
    }
    return map
  }, [all])

  return {
    from,
    to,
    isLoading: query.isLoading,
    isError: query.isError,
    /** Toan bo giao dich trong thang, chua loc thanh vien. */
    all,
    /** Da loc theo tab thanh vien dang chon. */
    rows,
    stats,
    byCategory,
    sharedByPayer,
  }
}

/** Nhom giao dich theo ngay de hien danh sach co tieu de ngay. */
export function groupByDay(rows: Transaction[]) {
  const map = new Map<string, Transaction[]>()
  for (const t of rows) {
    const list = map.get(t.occurred_at)
    if (list) list.push(t)
    else map.set(t.occurred_at, [t])
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
}

/** Tong thu/chi cua N thang gan nhat - dung cho bieu do xu huong. */
export function useTrend(months = 6) {
  const { month, member } = useUI()
  const end = dayjs(month).endOf('month')
  const start = end.subtract(months - 1, 'month').startOf('month')
  const query = useTransactions(dateKey(start), dateKey(end))

  return useMemo(() => {
    const rows = query.data ?? []
    const filtered = member === 'all' ? rows : rows.filter((t) => t.payer_id === member)
    const buckets: { key: string; label: string; income: number; expense: number }[] = []

    for (let i = 0; i < months; i++) {
      const m = start.add(i, 'month')
      buckets.push({ key: m.format('YYYY-MM'), label: m.format('M/YY'), income: 0, expense: 0 })
    }
    const index = new Map(buckets.map((b, i) => [b.key, i]))

    for (const t of filtered) {
      const i = index.get(dayjs(t.occurred_at).format('YYYY-MM'))
      if (i === undefined) continue
      if (t.type === 'income') buckets[i].income += t.amount
      else if (t.type === 'expense') buckets[i].expense += t.amount
    }
    return { buckets, isLoading: query.isLoading }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, query.isLoading, member, months, month])
}
