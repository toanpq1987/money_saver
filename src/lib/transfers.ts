import type { Transaction } from './types'

// ---------------------------------------------------------------------------
// Doi tai khoan cho ca loat giao dich (sua lai cho lo nhap nham vi)
// ---------------------------------------------------------------------------

export interface PlannedMove {
  tx: Transaction
  /** Dung mot o can doi: account_id, hoac to_account_id voi khoan chuyen vao. */
  patch: { account_id: string } | { to_account_id: string }
}

export type SkipReason = 'not-here' | 'same-account'

export interface MovePlan {
  moves: PlannedMove[]
  skipped: { tx: Transaction; reason: SkipReason }[]
}

/**
 * Tinh xem moi giao dich phai doi o nao de no thuoc ve `toId` thay vi `fromId`.
 *
 * Khoan chuyen tien co hai dau. Dang dung o tai khoan A ma chuyen ca loat sang
 * B, thi chi doi DAU nam o A - dau kia giu nguyen. Khoan chuyen tu B sang A
 * ma doi sang B se thanh "B chuyen cho chinh B", vo nghia, nen bo qua va bao
 * cho nguoi dung biet thay vi lang le tao ra mot dong ky quac.
 */
export function planMove(rows: Transaction[], fromId: string, toId: string): MovePlan {
  const plan: MovePlan = { moves: [], skipped: [] }

  for (const tx of rows) {
    const fromSide = tx.account_id === fromId
    const toSide = tx.type === 'transfer' && tx.to_account_id === fromId

    if (!fromSide && !toSide) {
      plan.skipped.push({ tx, reason: 'not-here' })
      continue
    }

    if (tx.type === 'transfer') {
      const other = fromSide ? tx.to_account_id : tx.account_id
      if (other === toId) {
        plan.skipped.push({ tx, reason: 'same-account' })
        continue
      }
    }

    plan.moves.push({
      tx,
      patch: fromSide ? { account_id: toId } : { to_account_id: toId },
    })
  }

  return plan
}

// ---------------------------------------------------------------------------
// Chia tien tu mot tai khoan ra nhieu tai khoan (nhan luong roi chia)
// ---------------------------------------------------------------------------

export interface SplitLeg {
  toAccountId: string | null
  amount: number
}

export interface SplitSummary {
  /** Cac dong du dieu kien de ghi thanh mot khoan chuyen. */
  valid: { toAccountId: string; amount: number }[]
  total: number
  /** Co dong nao tro nguoc ve chinh tai khoan nguon. */
  hasSelfTransfer: boolean
}

/**
 * Gom cac dong nguoi dung dang dien. Dong con trong (chua chon noi den hoac
 * chua co so tien) bi bo qua cho nguoi dung thoai mai them dong truoc roi dien
 * sau; dong chuyen ve chinh tai khoan nguon thi phai bao, vi do la go nham.
 */
export function summariseSplit(fromId: string | null, legs: SplitLeg[]): SplitSummary {
  const valid: SplitSummary['valid'] = []
  let hasSelfTransfer = false

  for (const leg of legs) {
    if (!leg.toAccountId || leg.amount <= 0) continue
    if (leg.toAccountId === fromId) {
      hasSelfTransfer = true
      continue
    }
    valid.push({ toAccountId: leg.toAccountId, amount: leg.amount })
  }

  return {
    valid,
    total: valid.reduce((sum, l) => sum + l.amount, 0),
    hasSelfTransfer,
  }
}
