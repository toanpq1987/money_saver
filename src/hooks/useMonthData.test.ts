import { describe, expect, it } from 'vitest'
import {
  aggregateByCategory,
  aggregateByPayer,
  aggregateDaily,
  aggregateSharedSplit,
  aggregateTrend,
  categoryTransactions,
  dayTransactions,
  flowTransactions,
  monthTransactions,
  payerTransactions,
  privateTransactions,
  sharedTransactions,
  summariseRows,
} from './useMonthData'
import type { Transaction } from '@/lib/types'

/**
 * Man Thong ke gio con so nao cung bam vao xem duoc chi tiet. Moi cap
 * (con so <-> bang chi tiet) deu phai khop tuyet doi, neu khong nguoi dung
 * thay dong ghi 3,5tr ma mo ra cong lai chi duoc 3,1tr - va khong biet tin ben
 * nao. Day la thu ma ca file test nay ton tai de giu.
 */

const AN = 'cat-an'
const DI = 'cat-di'
const DA_XOA = 'cat-da-bi-xoa'

const CHONG = 'p-chong'
const VO = 'p-vo'

const THANG_8 = '2026-08-01'

const CATS: Record<string, { name: string; icon: string; color: string }> = {
  [AN]: { name: 'Ăn uống', icon: '🍜', color: '#e8590c' },
  [DI]: { name: 'Di chuyển', icon: '🚗', color: '#1971c2' },
}

const look = (id: string | null | undefined) => (id ? CATS[id] : undefined)

let seq = 0
function tx(
  partial: Partial<Transaction> & { occurred_at: string; amount: number },
): Transaction {
  seq += 1
  return {
    id: `tx-${seq}`,
    household_id: 'h',
    type: 'expense',
    category_id: null,
    account_id: 'acc',
    to_account_id: null,
    payer_id: CHONG,
    is_shared: true,
    note: '',
    created_by: CHONG,
    created_at: '2026-08-10T00:00:00Z',
    updated_at: '2026-08-10T00:00:00Z',
    ...partial,
  }
}

/**
 * Mot so kha day du: hai thang, du thu / chi / chuyen khoan, khoan chung va
 * khoan rieng, hai nguoi chi, danh muc da bi xoa va khoan chua phan loai.
 * Moi bai doi chieu ben duoi deu chay tren dung so nay.
 */
const SO = [
  // Thang 8
  tx({ occurred_at: '2026-08-01', type: 'income', amount: 30_000_000, payer_id: CHONG }),
  tx({ occurred_at: '2026-08-02', type: 'transfer', amount: 25_000_000, payer_id: CHONG }),
  tx({ occurred_at: '2026-08-03', category_id: AN, amount: 120_000, payer_id: VO, is_shared: true }),
  tx({ occurred_at: '2026-08-03', category_id: AN, amount: 80_000, payer_id: CHONG, is_shared: false }),
  tx({ occurred_at: '2026-08-15', category_id: DI, amount: 300_000, payer_id: CHONG, is_shared: true }),
  tx({ occurred_at: '2026-08-15', category_id: null, amount: 50_000, payer_id: VO, is_shared: false }),
  tx({ occurred_at: '2026-08-18', category_id: DA_XOA, amount: 65_000, payer_id: CHONG, is_shared: true }),
  tx({ occurred_at: '2026-08-20', type: 'income', amount: 1_000_000, payer_id: VO }),
  // Thang 7 - de bat truong hop thong ke thang 8 an nham du lieu thang khac
  tx({ occurred_at: '2026-07-10', category_id: AN, amount: 999_000, payer_id: CHONG, is_shared: true }),
  tx({ occurred_at: '2026-07-11', type: 'income', amount: 2_000_000, payer_id: CHONG }),
]

const tong = (rows: Transaction[]) => rows.reduce((s, t) => s + t.amount, 0)

// ---------------------------------------------------------------------------

describe('tom tat mot danh sach giao dich', () => {
  it('chuyen khoan khong tinh vao thu cung khong tinh vao chi', () => {
    const s = summariseRows([
      tx({ occurred_at: '2026-08-01', type: 'transfer', amount: 25_000_000 }),
    ])
    expect(s).toMatchObject({ income: 0, expense: 0, net: 0, kind: 'empty' })
  })

  it('danh sach thuan chi thi biet la thuan chi', () => {
    const s = summariseRows([tx({ occurred_at: '2026-08-01', amount: 100_000 })])
    expect(s.kind).toBe('expense')
    expect(s.expense).toBe(100_000)
  })

  it('danh sach thuan thu thi biet la thuan thu', () => {
    const s = summariseRows([tx({ occurred_at: '2026-08-01', type: 'income', amount: 5_000_000 })])
    expect(s.kind).toBe('income')
    expect(s.income).toBe(5_000_000)
  })

  it('lan ca hai thi bao mixed va chenh lech co dau', () => {
    const s = summariseRows([
      tx({ occurred_at: '2026-08-01', type: 'income', amount: 1_000_000 }),
      tx({ occurred_at: '2026-08-02', amount: 1_500_000 }),
    ])
    expect(s.kind).toBe('mixed')
    expect(s.net).toBe(-500_000)
  })

  it('khoan 0 dong van tinh la co, khong bi coi la danh sach rong', () => {
    expect(summariseRows([tx({ occurred_at: '2026-08-01', amount: 0 })]).kind).toBe('expense')
  })
})

describe('ba o Thu / Chi / Chenh lech', () => {
  const s = summariseRows(SO)

  it('bam vao "Thu" ra dung nhung khoan lam nen con so do', () => {
    expect(tong(flowTransactions(SO, 'income'))).toBe(s.income)
  })

  it('bam vao "Chi" ra dung nhung khoan lam nen con so do', () => {
    expect(tong(flowTransactions(SO, 'expense'))).toBe(s.expense)
  })

  it('bam vao "Chenh lech" ra ca hai chieu va khong lan chuyen khoan', () => {
    const both = flowTransactions(SO, 'both')
    expect(both.some((t) => t.type === 'transfer')).toBe(false)
    expect(summariseRows(both)).toEqual(s)
  })
})

describe('co cau chi tieu', () => {
  it('chi lay khoan chi, bo qua khoan thu va chuyen khoan cung danh muc', () => {
    const rows = [
      tx({ occurred_at: '2026-08-01', category_id: AN, amount: 100_000 }),
      tx({ occurred_at: '2026-08-01', type: 'income', category_id: AN, amount: 500_000 }),
      tx({ occurred_at: '2026-08-01', type: 'transfer', category_id: AN, amount: 25_000_000 }),
    ]
    expect(categoryTransactions(rows, AN)).toHaveLength(1)
  })

  it('khoan chua phan loai khong tao ra dong nao', () => {
    const got = aggregateByCategory(
      [
        tx({ occurred_at: '2026-08-01', category_id: null, amount: 900_000 }),
        tx({ occurred_at: '2026-08-01', category_id: AN, amount: 100_000 }),
      ],
      look,
    )
    expect(got).toHaveLength(1)
    expect(got[0].share).toBe(100)
  })

  it('danh muc da bi xoa van hien ra duoi ten Khac chu khong bien mat', () => {
    const got = aggregateByCategory([tx({ occurred_at: '2026-08-01', category_id: DA_XOA, amount: 50_000 })], look)
    expect(got[0].name).toBe('Khác')
    expect(got[0].icon).toBe('📦')
  })

  it('moi dong mo ra dung so tien va dung so giao dich', () => {
    const slices = aggregateByCategory(SO, look)
    expect(slices.length).toBeGreaterThan(0)
    for (const s of slices) {
      const items = categoryTransactions(SO, s.categoryId)
      expect(tong(items), `tong cua ${s.name}`).toBe(s.total)
      expect(items.length, `so giao dich cua ${s.name}`).toBe(s.count)
    }
  })

  it('ty trong cac dong cong lai bang 100%', () => {
    const sum = aggregateByCategory(SO, look).reduce((acc, s) => acc + s.share, 0)
    expect(sum).toBeCloseTo(100, 6)
  })
})

describe('chi tieu theo ngay', () => {
  const buckets = aggregateDaily(SO, THANG_8)

  it('khong an nham khoan cua thang khac', () => {
    // Trong so co khoan 999k ngay 10/07. Neu chi nhin "ngay 10" ma khong nhin
    // thang thi no se nhay vao cot ngay 10 thang 8.
    expect(buckets[9].expense).toBe(0)
    expect(buckets[9].count).toBe(0)
  })

  it('moi cot mo ra dung so tien va dung so giao dich', () => {
    const coSoLieu = buckets.filter((b) => b.count > 0)
    expect(coSoLieu.length).toBeGreaterThan(0)
    for (const b of coSoLieu) {
      const items = dayTransactions(SO, THANG_8, b.day)
      expect(tong(items), `tong ngay ${b.day}`).toBe(b.expense)
      expect(items.length, `so giao dich ngay ${b.day}`).toBe(b.count)
    }
  })

  it('cong het cac cot lai bang tong chi cua thang do', () => {
    const trongThang = SO.filter((t) => t.occurred_at.startsWith('2026-08'))
    const congCacCot = buckets.reduce((s, b) => s + b.expense, 0)
    expect(congCacCot).toBe(summariseRows(trongThang).expense)
  })

  it('so cot dung bang so ngay cua thang', () => {
    expect(aggregateDaily([], '2026-02-01')).toHaveLength(28)
    expect(aggregateDaily([], '2026-08-01')).toHaveLength(31)
  })
})

describe('xu huong theo thang', () => {
  const buckets = aggregateTrend(SO, '2026-07-01', 2)

  it('dung so thang va dung thu tu', () => {
    expect(buckets.map((b) => b.key)).toEqual(['2026-07', '2026-08'])
  })

  it('moi cot mo ra dung so thu va so chi cua thang do', () => {
    for (const b of buckets) {
      const items = monthTransactions(SO, b.key)
      const s = summariseRows(items)
      expect(s.income, `thu thang ${b.key}`).toBe(b.income)
      expect(s.expense, `chi thang ${b.key}`).toBe(b.expense)
    }
  })

  it('bang chi tiet cua mot thang khong lan chuyen khoan', () => {
    expect(monthTransactions(SO, '2026-08').some((t) => t.type === 'transfer')).toBe(false)
  })
})

describe('khoan chung va khoan rieng', () => {
  const split = aggregateSharedSplit(SO)

  it('bam vao "Khoan chung" ra dung so tien do', () => {
    expect(tong(sharedTransactions(SO))).toBe(split.shared)
  })

  it('bam vao khoan rieng cua tung nguoi ra dung so tien do', () => {
    expect(split.privateByPayer.size).toBeGreaterThan(0)
    for (const [payerId, amount] of split.privateByPayer) {
      expect(tong(privateTransactions(SO, payerId)), `khoan rieng cua ${payerId}`).toBe(amount)
    }
  })

  it('chung cong rieng bang dung tong chi - khong khoan nao roi ra ngoai', () => {
    expect(split.shared + split.privateTotal).toBe(split.total)
    expect(split.total).toBe(summariseRows(SO).expense)
  })
})

describe('ai chi nhieu hon', () => {
  const byPayer = aggregateByPayer(SO)

  it('moi nguoi mo ra dung so chi va so thu cua ho', () => {
    expect(byPayer.size).toBe(2)
    for (const [payerId, totals] of byPayer) {
      const s = summariseRows(payerTransactions(SO, payerId))
      expect(s.expense, `chi cua ${payerId}`).toBe(totals.expense)
      expect(s.income, `thu cua ${payerId}`).toBe(totals.income)
    }
  })

  it('phan rieng cua moi nguoi khop voi bang khoan rieng', () => {
    for (const [payerId, totals] of byPayer) {
      expect(tong(privateTransactions(SO, payerId))).toBe(totals.privateExpense)
    }
  })

  it('bang chi tiet cua mot nguoi khong lan chuyen khoan', () => {
    // Chong co mot khoan chuyen 25tr - neu lot vao thi con so phong len gap boi
    expect(payerTransactions(SO, CHONG).some((t) => t.type === 'transfer')).toBe(false)
  })

  it('cong chi cua moi nguoi lai bang tong chi', () => {
    const sum = [...byPayer.values()].reduce((s, v) => s + v.expense, 0)
    expect(sum).toBe(summariseRows(SO).expense)
  })
})
