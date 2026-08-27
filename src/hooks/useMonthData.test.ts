import { describe, expect, it } from 'vitest'
import { aggregateByCategory, categoryTransactions } from './useMonthData'
import type { Transaction } from '@/lib/types'

/**
 * Bang xep hang "Co cau chi tieu" va danh sach hien ra khi bam vao mot dong
 * phai dua tren cung mot dinh nghia. Neu lech nhau thi nguoi dung thay tren
 * dong ghi 3,5tr ma mo ra cong lai chi duoc 3,1tr - va khong biet tin ben nao.
 * Day la thu ma test phai giu.
 */

const AN = 'cat-an'
const DI = 'cat-di'
const DA_XOA = 'cat-da-bi-xoa'

const CATS: Record<string, { name: string; icon: string; color: string }> = {
  [AN]: { name: 'Ăn uống', icon: '🍜', color: '#e8590c' },
  [DI]: { name: 'Di chuyển', icon: '🚗', color: '#1971c2' },
}

const look = (id: string | null | undefined) => (id ? CATS[id] : undefined)

let seq = 0
function tx(partial: Partial<Transaction> & { amount: number }): Transaction {
  seq += 1
  return {
    id: `tx-${seq}`,
    household_id: 'h',
    type: 'expense',
    occurred_at: '2026-08-10',
    category_id: null,
    account_id: 'acc',
    to_account_id: null,
    payer_id: 'p',
    is_shared: true,
    note: '',
    created_by: 'p',
    created_at: '2026-08-10T00:00:00Z',
    updated_at: '2026-08-10T00:00:00Z',
    ...partial,
  }
}

describe('cac giao dich lam nen mot dong danh muc', () => {
  it('chi lay khoan chi, bo qua khoan thu cung danh muc', () => {
    const rows = [
      tx({ type: 'expense', category_id: AN, amount: 100_000 }),
      tx({ type: 'income', category_id: AN, amount: 500_000 }),
    ]
    const got = categoryTransactions(rows, AN)
    expect(got).toHaveLength(1)
    expect(got[0].amount).toBe(100_000)
  })

  it('bo qua chuyen khoan du co gan danh muc', () => {
    const rows = [
      tx({ type: 'expense', category_id: AN, amount: 100_000 }),
      tx({ type: 'transfer', category_id: AN, amount: 25_000_000 }),
    ]
    expect(categoryTransactions(rows, AN)).toHaveLength(1)
  })

  it('khong lay nham danh muc khac', () => {
    const rows = [
      tx({ category_id: AN, amount: 100_000 }),
      tx({ category_id: DI, amount: 200_000 }),
    ]
    expect(categoryTransactions(rows, DI).map((t) => t.amount)).toEqual([200_000])
  })

  it('danh muc khong con giao dich nao thi tra ve mang rong', () => {
    expect(categoryTransactions([tx({ category_id: AN, amount: 1 })], DI)).toEqual([])
  })
})

describe('gom chi tieu theo danh muc', () => {
  it('cong don va sap xep tu nhieu toi it', () => {
    const rows = [
      tx({ category_id: AN, amount: 100_000 }),
      tx({ category_id: DI, amount: 500_000 }),
      tx({ category_id: AN, amount: 200_000 }),
    ]
    const got = aggregateByCategory(rows, look)
    expect(got.map((s) => s.categoryId)).toEqual([DI, AN])
    expect(got[0].total).toBe(500_000)
    expect(got[1].total).toBe(300_000)
    expect(got[1].count).toBe(2)
  })

  it('khoan chua phan loai khong tao ra dong nao', () => {
    const rows = [
      tx({ category_id: null, amount: 900_000 }),
      tx({ category_id: AN, amount: 100_000 }),
    ]
    const got = aggregateByCategory(rows, look)
    expect(got).toHaveLength(1)
    // ...va cung khong duoc am tham keo ty trong xuong
    expect(got[0].share).toBe(100)
  })

  it('danh muc da bi xoa van hien ra duoi ten Khac chu khong bien mat', () => {
    const got = aggregateByCategory([tx({ category_id: DA_XOA, amount: 50_000 })], look)
    expect(got[0].name).toBe('Khác')
    expect(got[0].icon).toBe('📦')
  })

  it('khong co khoan chi nao thi khong co dong nao', () => {
    expect(aggregateByCategory([tx({ type: 'income', category_id: AN, amount: 5 })], look)).toEqual(
      [],
    )
  })
})

describe('bang chi tiet khop voi con so tren dong vua bam', () => {
  // Co du cac loai de bay ra lech: thu, chuyen khoan, chua phan loai, danh muc
  // da xoa, va nhieu giao dich trong cung mot danh muc.
  const rows = [
    tx({ category_id: AN, amount: 120_000 }),
    tx({ category_id: AN, amount: 45_500 }),
    tx({ category_id: DI, amount: 300_000 }),
    tx({ category_id: DA_XOA, amount: 80_000 }),
    tx({ category_id: null, amount: 999_000 }),
    tx({ type: 'income', category_id: AN, amount: 30_000_000 }),
    tx({ type: 'transfer', category_id: DI, amount: 25_000_000 }),
  ]
  const slices = aggregateByCategory(rows, look)

  it('moi dong deu mo ra duoc dung so tien va dung so giao dich', () => {
    expect(slices.length).toBeGreaterThan(0)
    for (const s of slices) {
      const items = categoryTransactions(rows, s.categoryId)
      const sum = items.reduce((acc, t) => acc + t.amount, 0)
      expect(sum, `tong cua ${s.name}`).toBe(s.total)
      expect(items.length, `so giao dich cua ${s.name}`).toBe(s.count)
    }
  })

  it('ty trong cua cac dong cong lai bang 100%', () => {
    const sum = slices.reduce((acc, s) => acc + s.share, 0)
    expect(sum).toBeCloseTo(100, 6)
  })
})
