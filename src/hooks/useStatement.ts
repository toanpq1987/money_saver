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
 * Dung sao ke cua MOT tai khoan trong mot thang.
 *
 * @param history Toan bo giao dich tu truoc toi het thang, DA sap xep cu truoc
 *   (dung sortForRunningBalance). Phai co ca lich su cu chu khong chi rieng
 *   thang dang xem, vi so du dau ky la ket qua cong don cua moi giao dich
 *   truoc do.
 * @param monthStart Ngay dau thang, dang 'YYYY-MM-DD'.
 */
export function buildStatement(
  account: Account,
  history: Transaction[],
  monthStart: string,
): AccountStatement {
  let running = account.opening_balance
  let balanceStart = account.opening_balance
  let inflow = 0
  let outflow = 0
  const rows: StatementRow[] = []

  for (const tx of history) {
    const delta = effectOn(tx, account.id)
    if (delta === 0) continue

    running += delta

    if (tx.occurred_at < monthStart) {
      // Truoc thang dang xem: chi cong vao so du dau ky, khong liet ke
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
 * Sao ke moi tai khoan trong mot thang, dung de doi chieu voi sao ke ngan hang.
 */
export function useAccountStatements(month: string): {
  statements: AccountStatement[]
  isLoading: boolean
} {
  const { accounts } = useApp()

  const monthStart = dateKey(dayjs(month).startOf('month'))
  const monthEnd = dateKey(dayjs(month).endOf('month'))
  const query = useTransactions('1970-01-01', monthEnd)

  const statements = useMemo(() => {
    const ordered = sortForRunningBalance(query.data ?? [])
    return accounts
      .filter((a) => !a.archived)
      .map((account) => buildStatement(account, ordered, monthStart))
  }, [query.data, accounts, monthStart])

  return { statements, isLoading: query.isLoading }
}
