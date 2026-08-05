import { useMemo } from 'react'
import { useApp } from './useApp'
import { dateKey, dayjs } from '@/lib/format'
import { useTransactions } from '@/lib/queries'
import type { Account, Transaction } from '@/lib/types'

export interface StatementRow {
  tx: Transaction
  /** So tien giao dich lam thay doi tai khoan nay: duong la vao, am la ra. */
  delta: number
  /** So du cua tai khoan ngay sau giao dich nay. */
  balanceAfter: number
}

export interface AccountStatement {
  account: Account
  balanceStart: number
  inflow: number
  outflow: number
  balanceEnd: number
  /** Giao dich trong thang, moi nhat truoc. */
  rows: StatementRow[]
}

/**
 * Mot giao dich lam so du cua tai khoan thay doi bao nhieu.
 * Chuyen khoan tru o vi gui va cong o vi nhan.
 */
export function effectOn(tx: Transaction, accountId: string): number {
  if (tx.type === 'transfer') {
    if (tx.account_id === accountId) return -tx.amount
    if (tx.to_account_id === accountId) return tx.amount
    return 0
  }
  if (tx.account_id !== accountId) return 0
  return tx.type === 'income' ? tx.amount : -tx.amount
}

/** Sap xep cu nhat truoc, de cong don so du theo dung thu tu thoi gian. */
export function sortForRunningBalance(history: Transaction[]): Transaction[] {
  return [...history].sort((a, b) => {
    if (a.occurred_at !== b.occurred_at) return a.occurred_at < b.occurred_at ? -1 : 1
    return (a.created_at ?? '') < (b.created_at ?? '') ? -1 : 1
  })
}

/**
 * Dung sao ke cua MOT tai khoan trong mot khoang ngay bat ky.
 *
 * Khoang khong nhat thiet la mot thang duong lich: sao ke the tin dung thuong
 * chay tu ngay 24 thang truoc den 23 thang nay, doi chieu voi mung 1 den het
 * thang thi khong bao gio khop.
 *
 * @param history Toan bo giao dich tu truoc toi het ky, DA sap xep cu truoc
 *   (dung sortForRunningBalance). Phai co ca lich su cu chu khong chi rieng
 *   ky dang xem, vi so du dau ky la ket qua cong don cua moi giao dich
 *   truoc do.
 * @param from Ngay dau ky, dang 'YYYY-MM-DD'. Tinh ca ngay nay.
 * @param to   Ngay cuoi ky, dang 'YYYY-MM-DD'. Tinh ca ngay nay.
 */
export function buildStatement(
  account: Account,
  history: Transaction[],
  from: string,
  to: string,
): AccountStatement {
  let running = account.opening_balance
  let balanceStart = account.opening_balance
  let inflow = 0
  let outflow = 0
  const rows: StatementRow[] = []

  for (const tx of history) {
    const delta = effectOn(tx, account.id)
    if (delta === 0) continue

    // Sau ky dang xem: khong duoc dung toi so du cuoi ky. Truy van thuong da
    // cat san, nhung chan o day de ham nay tu no luon cho ket qua dung.
    if (tx.occurred_at > to) continue

    running += delta

    if (tx.occurred_at < from) {
      // Truoc ky dang xem: chi cong vao so du dau ky, khong liet ke
      balanceStart = running
      continue
    }

    if (delta > 0) inflow += delta
    else outflow += -delta
    rows.push({ tx, delta, balanceAfter: running })
  }

  return {
    account,
    balanceStart,
    inflow,
    outflow,
    balanceEnd: running,
    rows: rows.reverse(), // hien moi nhat truoc
  }
}

/**
 * Khoang ngay cua mot ky the tin dung.
 *
 * VPBank va phan lon the deu chot vao giua thang: ky "thang 8" that ra chay
 * tu 24/07 den 23/08. Ngay chot gioi han toi 28 de thang nao cung co ngay do.
 *
 * @param month Thang dang xem, dang 'YYYY-MM-01' - la thang chua ngay KET ky.
 * @param startDay Ngay bat dau ky hang thang (2-28).
 */
export function cycleBounds(month: string, startDay: number): { from: string; to: string } {
  const day = Math.min(28, Math.max(2, Math.round(startDay)))
  const anchor = dayjs(month).date(day)
  return {
    from: dateKey(anchor.subtract(1, 'month')),
    to: dateKey(anchor.subtract(1, 'day')),
  }
}

/** Khoang ngay cua tron mot thang duong lich. */
export function monthBounds(month: string): { from: string; to: string } {
  return {
    from: dateKey(dayjs(month).startOf('month')),
    to: dateKey(dayjs(month).endOf('month')),
  }
}

/**
 * Sao ke moi tai khoan trong mot khoang ngay, de doi chieu voi ngan hang.
 */
export function useAccountStatements(
  from: string,
  to: string,
): {
  statements: AccountStatement[]
  isLoading: boolean
} {
  const { accounts } = useApp()

  // Lay ca lich su cu chu khong chi rieng ky dang xem: so du dau ky la ket
  // qua cong don cua moi giao dich truoc do.
  const query = useTransactions('1970-01-01', to)

  const statements = useMemo(() => {
    const ordered = sortForRunningBalance(query.data ?? [])
    return accounts
      .filter((a) => !a.archived)
      .map((account) => buildStatement(account, ordered, from, to))
  }, [query.data, accounts, from, to])

  return { statements, isLoading: query.isLoading }
}
