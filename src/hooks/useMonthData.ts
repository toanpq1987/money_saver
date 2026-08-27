import { useMemo } from 'react'
import { useApp } from './useApp'
import { dateKey, dayjs } from '@/lib/format'
import { useTransactions } from '@/lib/queries'
import { useUI } from '@/lib/store'
import type { Transaction } from '@/lib/types'

/** Khoang thoi gian dang xem o man hinh Thong ke. */
export type RangeKey = 'month' | '3m' | '6m' | 'year' | 'all'

export const RANGE_LABELS: Record<RangeKey, string> = {
  month: 'Tháng này',
  '3m': '3 tháng',
  '6m': '6 tháng',
  year: 'Năm nay',
  all: 'Toàn thời gian',
}

/**
 * Doi khoang thoi gian thanh cap ngay dau/cuoi.
 * `month` la thang dang chon lam moc (dang 'YYYY-MM-01').
 */
export function rangeBounds(range: RangeKey, month: string): { from: string; to: string } {
  const end = dayjs(month).endOf('month')
  switch (range) {
    case 'month':
      return { from: dateKey(dayjs(month).startOf('month')), to: dateKey(end) }
    case '3m':
      return { from: dateKey(end.subtract(2, 'month').startOf('month')), to: dateKey(end) }
    case '6m':
      return { from: dateKey(end.subtract(5, 'month').startOf('month')), to: dateKey(end) }
    case 'year':
      return { from: dateKey(end.startOf('year')), to: dateKey(end) }
    case 'all':
      // Bao tron moi giao dich, ke ca cac khoan ghi ngay trong tuong lai
      return { from: '1970-01-01', to: '2999-12-31' }
  }
}

/** So thang can ve tren bieu do xu huong ung voi tung khoang. */
export function rangeTrendMonths(range: RangeKey): number {
  switch (range) {
    case 'month':
      return 6
    case '3m':
      return 3
    case '6m':
      return 6
    case 'year':
      return 12
    case 'all':
      return 24
  }
}

export interface CategorySlice {
  categoryId: string
  name: string
  icon: string
  color: string
  total: number
  count: number
  share: number
}

/** Chi can bay nhieu de ve mot dong trong "Co cau chi tieu". */
type CategoryLook = (
  id: string | null | undefined,
) => { name: string; icon: string; color: string } | undefined

/**
 * Dieu kien de mot giao dich duoc tinh vao "Co cau chi tieu".
 *
 * Chi dinh nghia DUNG MOT LAN vi ca hai phia deu phai hoi cung mot cau: bang
 * xep hang o tren va danh sach chi tiet hien ra khi bam vao mot dong. Neu hai
 * ben lech nhau - vi du ben nay quen loai khoan thu dung chung category_id -
 * thi tong o bang chi tiet se khac con so tren dong vua bam, va nguoi dung
 * khong biet phai tin con so nao.
 */
function isCategorisedExpense(t: Transaction): t is Transaction & { category_id: string } {
  return t.type === 'expense' && Boolean(t.category_id)
}

/** Cac giao dich lam nen mot dong trong "Co cau chi tieu". */
export function categoryTransactions(rows: Transaction[], categoryId: string): Transaction[] {
  return rows.filter((t) => isCategorisedExpense(t) && t.category_id === categoryId)
}

/** Gom chi tieu theo danh muc, sap xep tu nhieu toi it. */
export function aggregateByCategory(
  rows: Transaction[],
  categoryById: CategoryLook,
): CategorySlice[] {
  const map = new Map<string, { total: number; count: number }>()
  let total = 0
  for (const t of rows) {
    if (!isCategorisedExpense(t)) continue
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
}

/**
 * Du lieu cua thang dang xem, da ap dung bo loc thanh vien.
 * Chuyen khoan giua 2 vi khong duoc tinh la thu hay chi.
 *
 * @param accountIds Chi lay giao dich lien quan toi cac tai khoan nay (mot
 *   "ví" gom nhieu tai khoan). Bo trong = tinh het.
 *   Truyen tu ben ngoai (thay vi luu trong store dung chung) de bo loc o
 *   man hinh Thong ke khong am tham lam sai so lieu o Trang chu.
 * @param range Khoang thoi gian. Mac dinh chi lay thang dang chon.
 */
export function useMonthData(accountIds?: string[] | null, range: RangeKey = 'month') {
  const { month, member } = useUI()
  const { categoryById } = useApp()

  const { from, to } = rangeBounds(range, month)
  const query = useTransactions(from, to)

  const all = useMemo(() => query.data ?? [], [query.data])

  // Mang doi tham chieu moi lan ve lai, dung chuoi khoa cho on dinh.
  const walletKey = accountIds?.join(',') ?? ''

  const rows = useMemo(() => {
    let list = all
    if (member !== 'all') list = list.filter((t) => t.payer_id === member)
    if (walletKey) {
      const mine = new Set(walletKey.split(','))
      list = list.filter(
        (t) =>
          (t.account_id && mine.has(t.account_id)) ||
          (t.to_account_id && mine.has(t.to_account_id)),
      )
    }
    return list
  }, [all, member, walletKey])

  const stats = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of rows) {
      if (t.type === 'income') income += t.amount
      else if (t.type === 'expense') expense += t.amount
    }
    return { income, expense, net: income - expense }
  }, [rows])

  const byCategory = useMemo<CategorySlice[]>(
    () => aggregateByCategory(rows, categoryById),
    [rows, categoryById],
  )

  /**
   * Tach chi tieu thanh khoan CHUNG cua gia dinh va khoan RIENG cua tung nguoi.
   *
   * Tinh tren `rows` (da loc theo tab thanh vien) nen khi bam vao tab cua mot
   * nguoi, con so se tra loi dung cau hoi "khoan nao la cua rieng nguoi nay".
   */
  const sharedSplit = useMemo(() => {
    let shared = 0
    const privateByPayer = new Map<string, number>()

    for (const t of rows) {
      if (t.type !== 'expense') continue
      if (t.is_shared) shared += t.amount
      else privateByPayer.set(t.payer_id, (privateByPayer.get(t.payer_id) ?? 0) + t.amount)
    }

    const privateTotal = [...privateByPayer.values()].reduce((s, v) => s + v, 0)
    return { shared, privateByPayer, privateTotal, total: shared + privateTotal }
  }, [rows])

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
    sharedSplit,
    sharedByPayer,
  }
}

export interface WalletFlow {
  /** So du hien tai cua nhom vi. */
  balance: number
  /** Thu nhap vao nhom vi trong thang (luong, thuong...). */
  income: number
  /** Nhan chuyen khoan tu vi ben ngoai nhom. */
  transferIn: number
  /** Chuyen sang vi ben ngoai nhom (vi du dua vo). */
  transferOut: number
  expense: number
  /** Vao bao nhieu, ra bao nhieu, con lai bao nhieu trong thang. */
  net: number
  hasWallets: boolean
}

/**
 * Dong tien cua MOT NHOM VI trong thang dang xem.
 *
 * Dung de tra loi "tien rieng cua toi thang nay vao ra the nao". Khac voi bo
 * loc theo nguoi: sau khi chuyen 25tr cho vo thi so tien do khong con la cua
 * minh nua, du minh van la nguoi kiem ra no - nen phai tinh theo VI chu khong
 * theo NGUOI CHI.
 *
 * Chuyen khoan qua lai giua cac vi trong cung nhom khong duoc tinh vao dau.
 */
export function useWalletFlow(accountIds: string[]): WalletFlow {
  const { month } = useUI()
  const { balanceOf } = useApp()

  const from = dateKey(dayjs(month).startOf('month'))
  const to = dateKey(dayjs(month).endOf('month'))
  const query = useTransactions(from, to)

  // Mang doi tham chieu moi lan ve lai, dung chuoi khoa cho on dinh.
  const key = accountIds.join(',')

  return useMemo(() => {
    const ids = key ? key.split(',') : []
    const mine = new Set(ids)
    const flow: WalletFlow = {
      balance: 0,
      income: 0,
      transferIn: 0,
      transferOut: 0,
      expense: 0,
      net: 0,
      hasWallets: ids.length > 0,
    }
    if (ids.length === 0) return flow

    flow.balance = ids.reduce((sum, id) => sum + balanceOf(id), 0)

    for (const t of query.data ?? []) {
      const fromMine = t.account_id ? mine.has(t.account_id) : false
      const toMine = t.to_account_id ? mine.has(t.to_account_id) : false

      if (t.type === 'transfer') {
        if (fromMine && toMine) continue // chuyen qua lai trong cung nhom vi
        if (fromMine) flow.transferOut += t.amount
        else if (toMine) flow.transferIn += t.amount
      } else if (fromMine) {
        if (t.type === 'income') flow.income += t.amount
        else flow.expense += t.amount
      }
    }

    flow.net = flow.income + flow.transferIn - flow.transferOut - flow.expense
    return flow
  }, [query.data, key, balanceOf])
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
