import type { QueryClient } from '@tanstack/react-query'
import type { AccountBalance, Transaction } from './types'

// Viet thang khoa truy van thay vi import tu queries.ts, tranh vong import.
const BALANCES_KEY = ['balances'] as const

/**
 * Cap nhat truoc giao dien ngay khi nguoi dung bam Luu, chua can may chu tra loi.
 * Khi mat mang thi day chinh la thu duy nhat giu cho app van dung.
 *
 * Cac ban ghi tao/sua khi offline duoc danh dau `_pending` de hien nhan
 * "chờ gửi" trong danh sach.
 */

type Action = 'insert' | 'update' | 'delete'

interface Row {
  id: string
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Danh sach thuong (quy tiet kiem, so tiet kiem, hoa don, vay no, ...)
// ---------------------------------------------------------------------------

export function applyListLocally(
  qc: QueryClient,
  key: readonly unknown[],
  row: Row,
  action: Action,
  pending: boolean,
) {
  qc.setQueryData(key, (old: Row[] | undefined) => {
    if (!old) return old
    if (action === 'delete') return old.filter((r) => r.id !== row.id)

    const index = old.findIndex((r) => r.id === row.id)
    const marked = { ...row, ...(pending ? { _pending: true } : {}) }
    if (index === -1) return [marked, ...old]

    const next = [...old]
    next[index] = { ...next[index], ...marked }
    return next
  })
}

// ---------------------------------------------------------------------------
// Giao dich - phai chen dung vao tung khoang ngay dang duoc cache
// ---------------------------------------------------------------------------

/** Tim mot giao dich trong bat ky khoang ngay nao dang co trong cache. */
export function findCachedTransaction(qc: QueryClient, id: string): Transaction | undefined {
  for (const query of qc.getQueryCache().findAll({ queryKey: ['transactions'] })) {
    const rows = query.state.data as Transaction[] | undefined
    const hit = rows?.find((t) => t.id === id)
    if (hit) return hit
  }
  return undefined
}

export function applyTransactionLocally(
  qc: QueryClient,
  tx: Transaction,
  action: Action,
  pending: boolean,
) {
  for (const query of qc.getQueryCache().findAll({ queryKey: ['transactions'] })) {
    const [, from, to] = query.queryKey as [string, string, string]
    const rows = query.state.data as Transaction[] | undefined
    const belongsHere = action !== 'delete' && tx.occurred_at >= from && tx.occurred_at <= to

    // Khoang ngay chua tung tai duoc (mo app luc mat mang roi chuyen thang):
    // van phai cho ban ghi moi hien ra, neu khong nguoi dung tuong bi mat.
    // Khi co mang lai, du lieu that se duoc tai de len.
    if (!rows && !belongsHere) continue

    const withoutIt = (rows ?? []).filter((t) => t.id !== tx.id)

    qc.setQueryData(
      query.queryKey,
      belongsHere
        ? [...withoutIt, { ...tx, ...(pending ? { _pending: true } : {}) }].sort(byNewestFirst)
        : withoutIt,
    )
  }
}

function byNewestFirst(a: Transaction, b: Transaction) {
  if (a.occurred_at !== b.occurred_at) return a.occurred_at < b.occurred_at ? 1 : -1
  return (a.created_at ?? '') < (b.created_at ?? '') ? 1 : -1
}

// ---------------------------------------------------------------------------
// So du vi - tinh lai ngay de man hinh Tong quan khong bi sai khi offline
// ---------------------------------------------------------------------------

/** So tien mot giao dich lam thay doi tung vi. sign = +1 cong vao, -1 go ra. */
function balanceDelta(tx: Transaction, sign: 1 | -1): Map<string, number> {
  const delta = new Map<string, number>()
  const add = (accountId: string | null, amount: number) => {
    if (!accountId) return
    delta.set(accountId, (delta.get(accountId) ?? 0) + amount * sign)
  }

  if (tx.type === 'income') add(tx.account_id, tx.amount)
  else if (tx.type === 'expense') add(tx.account_id, -tx.amount)
  else {
    add(tx.account_id, -tx.amount)
    add(tx.to_account_id, tx.amount)
  }
  return delta
}

export function applyBalanceLocally(
  qc: QueryClient,
  next: Transaction | null,
  previous: Transaction | null,
) {
  const combined = new Map<string, number>()
  const merge = (m: Map<string, number>) => {
    for (const [id, v] of m) combined.set(id, (combined.get(id) ?? 0) + v)
  }

  if (previous) merge(balanceDelta(previous, -1))
  if (next) merge(balanceDelta(next, 1))
  if (combined.size === 0) return

  qc.setQueryData(BALANCES_KEY, (old: AccountBalance[] | undefined) =>
    old?.map((b) =>
      combined.has(b.account_id)
        ? { ...b, balance: b.balance + (combined.get(b.account_id) ?? 0) }
        : b,
    ),
  )
}
