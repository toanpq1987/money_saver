import { describe, expect, it } from 'vitest'
import { planMove, summariseSplit } from './transfers'
import type { Transaction } from './types'

const BIDV = 'bidv'
const MOMO = 'momo'
const VCB = 'vcb'

let seq = 0
function tx(partial: Partial<Transaction>): Transaction {
  seq += 1
  return {
    id: `tx-${seq}`,
    household_id: 'h',
    type: 'expense',
    amount: 100_000,
    occurred_at: '2026-10-01',
    category_id: 'c',
    account_id: BIDV,
    to_account_id: null,
    payer_id: 'p',
    is_shared: true,
    note: '',
    created_by: 'p',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    ...partial,
  }
}

describe('planMove - doi tai khoan ca loat', () => {
  it('khoan chi va khoan thu: doi account_id', () => {
    const a = tx({ type: 'expense' })
    const b = tx({ type: 'income' })
    const plan = planMove([a, b], BIDV, MOMO)
    expect(plan.skipped).toEqual([])
    expect(plan.moves.map((m) => m.patch)).toEqual([{ account_id: MOMO }, { account_id: MOMO }])
  })

  it('khoan chuyen DI tu tai khoan nay: chi doi dau gui, dau nhan giu nguyen', () => {
    const t = tx({ type: 'transfer', account_id: BIDV, to_account_id: VCB, category_id: null })
    const plan = planMove([t], BIDV, MOMO)
    expect(plan.moves).toEqual([{ tx: t, patch: { account_id: MOMO } }])
  })

  it('khoan chuyen VAO tai khoan nay: doi dau nhan', () => {
    const t = tx({ type: 'transfer', account_id: VCB, to_account_id: BIDV, category_id: null })
    const plan = planMove([t], BIDV, MOMO)
    expect(plan.moves).toEqual([{ tx: t, patch: { to_account_id: MOMO } }])
  })

  it('doi xong thanh tu chuyen cho chinh minh thi bo qua, khong ghi', () => {
    const out = tx({ type: 'transfer', account_id: BIDV, to_account_id: MOMO, category_id: null })
    const inn = tx({ type: 'transfer', account_id: MOMO, to_account_id: BIDV, category_id: null })
    const plan = planMove([out, inn], BIDV, MOMO)
    expect(plan.moves).toEqual([])
    expect(plan.skipped.map((s) => s.reason)).toEqual(['same-account', 'same-account'])
  })

  it('khoan khong dinh gi toi tai khoan nguon thi khong dung vao', () => {
    // Vd nguoi kia vua doi khoan nay sang vi khac trong luc minh dang chon
    const t = tx({ account_id: VCB })
    const plan = planMove([t], BIDV, MOMO)
    expect(plan.moves).toEqual([])
    expect(plan.skipped[0].reason).toBe('not-here')
  })

  it('to_account_id cua khoan chi/thu (luon null) khong bi nham la dau nhan', () => {
    const t = tx({ type: 'expense', account_id: VCB, to_account_id: BIDV })
    expect(planMove([t], BIDV, MOMO).moves).toEqual([])
  })
})

describe('summariseSplit - chia luong ra nhieu tai khoan', () => {
  it('nhan 5tr vao BIDV, chia 2tr Momo + 2tr VCB: tong 4tr, con lai 1tr o BIDV', () => {
    const s = summariseSplit(BIDV, [
      { toAccountId: MOMO, amount: 2_000_000 },
      { toAccountId: VCB, amount: 2_000_000 },
    ])
    expect(s.valid).toHaveLength(2)
    expect(s.total).toBe(4_000_000)
    expect(s.hasSelfTransfer).toBe(false)
  })

  it('dong chua dien xong bi bo qua, khong lam hong ca form', () => {
    const s = summariseSplit(BIDV, [
      { toAccountId: MOMO, amount: 2_000_000 },
      { toAccountId: null, amount: 500_000 },
      { toAccountId: VCB, amount: 0 },
    ])
    expect(s.valid).toEqual([{ toAccountId: MOMO, amount: 2_000_000 }])
    expect(s.total).toBe(2_000_000)
  })

  it('chuyen ve chinh tai khoan nguon thi bao loi va khong tinh vao tong', () => {
    const s = summariseSplit(BIDV, [
      { toAccountId: BIDV, amount: 1_000_000 },
      { toAccountId: MOMO, amount: 2_000_000 },
    ])
    expect(s.hasSelfTransfer).toBe(true)
    expect(s.total).toBe(2_000_000)
  })
})
