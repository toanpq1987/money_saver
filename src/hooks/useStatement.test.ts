import { describe, expect, it } from 'vitest'
import {
  buildStatement,
  cycleBounds,
  effectOn,
  monthBounds,
  sortForRunningBalance,
} from './useStatement'
import type { Account, Transaction } from '@/lib/types'

/**
 * Sao ke duoc dung de doi chieu voi sao ke ngan hang gui ve, nen phep tinh
 * phai khop tuyet doi. Day la phan dang duoc kiem tra ky nhat cua app.
 */

const VI = 'acc-vi'
const THE = 'acc-the'

function account(id: string, opening = 0): Account {
  return {
    id,
    household_id: 'h',
    owner_id: null,
    name: id,
    kind: 'bank',
    icon: '🏦',
    color: '#2a78d6',
    opening_balance: opening,
    archived: false,
    sort_order: 1,
    created_at: '2026-01-01T00:00:00Z',
  }
}

let seq = 0
function tx(partial: Partial<Transaction> & { occurred_at: string; amount: number }): Transaction {
  seq += 1
  return {
    id: `tx-${seq}`,
    household_id: 'h',
    type: 'expense',
    category_id: null,
    account_id: VI,
    to_account_id: null,
    payer_id: 'p',
    is_shared: true,
    note: '',
    created_by: 'p',
    created_at: `2026-01-01T00:00:${String(seq).padStart(2, '0')}Z`,
    updated_at: '2026-01-01T00:00:00Z',
    ...partial,
  }
}

describe('mot giao dich lam so du doi bao nhieu', () => {
  it('khoan thu cong vao, khoan chi tru ra', () => {
    expect(effectOn(tx({ type: 'income', amount: 1000, occurred_at: '2026-08-05' }), VI)).toBe(1000)
    expect(effectOn(tx({ type: 'expense', amount: 400, occurred_at: '2026-08-05' }), VI)).toBe(-400)
  })

  it('chuyen khoan tru o vi gui va cong o vi nhan', () => {
    const t = tx({
      type: 'transfer',
      amount: 700,
      account_id: VI,
      to_account_id: THE,
      occurred_at: '2026-08-05',
    })
    expect(effectOn(t, VI)).toBe(-700)
    expect(effectOn(t, THE)).toBe(700)
  })

  it('khong dung toi tai khoan khac', () => {
    const t = tx({ type: 'expense', amount: 400, occurred_at: '2026-08-05' })
    expect(effectOn(t, THE)).toBe(0)
  })
})

describe('sao ke mot thang', () => {
  const monthStart = '2026-08-01'
  const monthEnd = '2026-08-31'

  it('so du dau ky gom so du ban dau va moi giao dich truoc thang', () => {
    const history = sortForRunningBalance([
      tx({ type: 'income', amount: 5_000_000, occurred_at: '2026-07-10' }),
      tx({ type: 'expense', amount: 1_000_000, occurred_at: '2026-07-20' }),
    ])

    const s = buildStatement(account(VI, 2_000_000), history, monthStart, monthEnd)

    expect(s.balanceStart).toBe(6_000_000) // 2tr + 5tr - 1tr
    expect(s.rows).toHaveLength(0) // giao dich thang truoc khong duoc liet ke
    expect(s.balanceEnd).toBe(6_000_000)
  })

  it('cong don so du sau tung giao dich trong thang', () => {
    const history = sortForRunningBalance([
      tx({ type: 'income', amount: 1_000_000, occurred_at: '2026-07-31' }),
      tx({ type: 'expense', amount: 300_000, occurred_at: '2026-08-03' }),
      tx({ type: 'expense', amount: 200_000, occurred_at: '2026-08-10' }),
      tx({ type: 'income', amount: 500_000, occurred_at: '2026-08-20' }),
    ])

    const s = buildStatement(account(VI), history, monthStart, monthEnd)

    expect(s.balanceStart).toBe(1_000_000)
    expect(s.inflow).toBe(500_000)
    expect(s.outflow).toBe(500_000)
    expect(s.balanceEnd).toBe(1_000_000)

    // rows tra ve moi nhat truoc
    expect(s.rows.map((r) => r.tx.occurred_at)).toEqual(['2026-08-20', '2026-08-10', '2026-08-03'])
    expect(s.rows.map((r) => r.balanceAfter)).toEqual([1_000_000, 500_000, 700_000])
  })

  it('so du dau ky + vao - ra = so du cuoi ky', () => {
    const history = sortForRunningBalance([
      tx({ type: 'income', amount: 9_000_000, occurred_at: '2026-06-01' }),
      tx({ type: 'expense', amount: 1_250_000, occurred_at: '2026-08-02' }),
      tx({ type: 'income', amount: 400_000, occurred_at: '2026-08-15' }),
    ])

    const s = buildStatement(account(VI, 500_000), history, monthStart, monthEnd)

    expect(s.balanceStart + s.inflow - s.outflow).toBe(s.balanceEnd)
  })

  it('chuyen khoan giua hai tai khoan hien dung chieu o ca hai ben', () => {
    const history = sortForRunningBalance([
      tx({
        type: 'transfer',
        amount: 70_000_000,
        account_id: VI,
        to_account_id: THE,
        occurred_at: '2026-08-05',
      }),
    ])

    const gui = buildStatement(account(VI, 75_000_000), history, monthStart, monthEnd)
    const nhan = buildStatement(account(THE, 0), history, monthStart, monthEnd)

    expect(gui.outflow).toBe(70_000_000)
    expect(gui.inflow).toBe(0)
    expect(gui.balanceEnd).toBe(5_000_000)

    expect(nhan.inflow).toBe(70_000_000)
    expect(nhan.outflow).toBe(0)
    expect(nhan.balanceEnd).toBe(70_000_000)
  })

  it('the tin dung tieu vuot thi so du am', () => {
    const history = sortForRunningBalance([
      tx({ type: 'expense', amount: 1_435_500, occurred_at: '2026-08-08', account_id: THE }),
    ])

    const s = buildStatement(account(THE, 0), history, monthStart, monthEnd)

    expect(s.balanceEnd).toBe(-1_435_500)
    expect(s.rows[0].balanceAfter).toBe(-1_435_500)
  })

  it('thang khong co giao dich thi dau ky bang cuoi ky', () => {
    const history = sortForRunningBalance([
      tx({ type: 'income', amount: 3_000_000, occurred_at: '2026-05-05' }),
    ])

    const s = buildStatement(account(VI), history, monthStart, monthEnd)

    expect(s.rows).toHaveLength(0)
    expect(s.inflow).toBe(0)
    expect(s.outflow).toBe(0)
    expect(s.balanceStart).toBe(s.balanceEnd)
    expect(s.balanceEnd).toBe(3_000_000)
  })

  it('nhieu giao dich cung ngay van cong don theo dung thu tu nhap', () => {
    const history = sortForRunningBalance([
      tx({ type: 'expense', amount: 100, occurred_at: '2026-08-09' }),
      tx({ type: 'expense', amount: 200, occurred_at: '2026-08-09' }),
      tx({ type: 'expense', amount: 300, occurred_at: '2026-08-09' }),
    ])

    const s = buildStatement(account(VI, 1000), history, monthStart, monthEnd)

    // moi nhat truoc: 300 (con 400), 200 (con 700), 100 (con 900)
    expect(s.rows.map((r) => r.balanceAfter)).toEqual([400, 700, 900])
    expect(s.balanceEnd).toBe(400)
  })

  it('giao dich sau ngay cuoi ky khong duoc dung toi so du cuoi ky', () => {
    const history = sortForRunningBalance([
      tx({ type: 'expense', amount: 500, occurred_at: '2026-08-10' }),
      tx({ type: 'expense', amount: 9_000_000, occurred_at: '2026-09-01' }),
    ])

    const s = buildStatement(account(VI, 1_000_000), history, monthStart, monthEnd)

    expect(s.rows).toHaveLength(1)
    expect(s.balanceEnd).toBe(999_500)
  })
})

describe('sao ke mot khoang ngay bat ky', () => {
  it('ky cua the tin dung: 24/07 den 23/08', () => {
    const history = sortForRunningBalance([
      // Truoc ky - chi cong vao so du dau ky
      tx({ type: 'expense', amount: 1_000_000, occurred_at: '2026-07-23' }),
      // Trong ky, dung hai dau mut
      tx({ type: 'expense', amount: 300_000, occurred_at: '2026-07-24' }),
      tx({ type: 'expense', amount: 200_000, occurred_at: '2026-08-23' }),
      // Sang ky sau
      tx({ type: 'expense', amount: 700_000, occurred_at: '2026-08-24' }),
    ])

    const s = buildStatement(account(VI, 5_000_000), history, '2026-07-24', '2026-08-23')

    expect(s.balanceStart).toBe(4_000_000)
    expect(s.rows).toHaveLength(2)
    expect(s.outflow).toBe(500_000)
    expect(s.balanceEnd).toBe(3_500_000)
  })

  it('khoang chi mot ngay van tinh dung', () => {
    const history = sortForRunningBalance([
      tx({ type: 'income', amount: 100, occurred_at: '2026-08-04' }),
      tx({ type: 'income', amount: 200, occurred_at: '2026-08-05' }),
      tx({ type: 'income', amount: 400, occurred_at: '2026-08-06' }),
    ])

    const s = buildStatement(account(VI), history, '2026-08-05', '2026-08-05')

    expect(s.balanceStart).toBe(100)
    expect(s.rows).toHaveLength(1)
    expect(s.balanceEnd).toBe(300)
  })
})

describe('tinh hai dau mut cua ky', () => {
  it('ky the bat dau ngay 24 thi chay tu 24 thang truoc den 23 thang nay', () => {
    expect(cycleBounds('2026-08-01', 24)).toEqual({ from: '2026-07-24', to: '2026-08-23' })
  })

  it('vat qua nam moi van dung', () => {
    expect(cycleBounds('2026-01-01', 24)).toEqual({ from: '2025-12-24', to: '2026-01-23' })
  })

  it('ngay 28 la toi da nen thang hai cung co', () => {
    expect(cycleBounds('2026-03-01', 28)).toEqual({ from: '2026-02-28', to: '2026-03-27' })
    // Go 31 thi keo ve 28 chu khong nhay sang thang khac
    expect(cycleBounds('2026-03-01', 31)).toEqual({ from: '2026-02-28', to: '2026-03-27' })
  })

  it('theo thang thi tron mung 1 den het thang, ke ca thang 30 ngay', () => {
    expect(monthBounds('2026-08-01')).toEqual({ from: '2026-08-01', to: '2026-08-31' })
    expect(monthBounds('2026-04-01')).toEqual({ from: '2026-04-01', to: '2026-04-30' })
  })
})
