import { useMemo } from 'react'
import { EmptyState, Sheet } from '@/components/ui'
import { TransactionGroups } from '@/components/TransactionList'
import { categoryTransactions, RANGE_LABELS, type CategorySlice, type RangeKey } from '@/hooks/useMonthData'
import { dayjs, formatMoney } from '@/lib/format'
import type { Transaction } from '@/lib/types'

/**
 * Chi tiet mot dong trong "Co cau chi tieu": bam vao danh muc thi thay dung
 * nhung giao dich da lam nen con so do.
 *
 * KHONG tu di hoi may chu. Nhan thang `rows` ma man Thong ke dang dung - tuc la
 * da loc san theo khoang thoi gian, theo vi va theo thanh vien. Neu o day tu
 * truy van lai thi chi can mot bo loc bi bo quen la tong trong sheet lech voi
 * con so tren dong vua bam.
 *
 * Tong o day cung duoc cong lai tu chinh danh sach ben duoi chu khong lay
 * `slice.total`, de sau khi nguoi dung sua mot khoan ngay trong sheet thi phan
 * dau va phan than khong bao giai hai con so khac nhau.
 */
export function CategoryDetailSheet({
  open,
  onClose,
  slice,
  rows,
  range,
  from,
  to,
  scopeNote,
}: {
  open: boolean
  onClose: () => void
  slice: CategorySlice | null
  rows: Transaction[]
  range: RangeKey
  from: string
  to: string
  /** Bo loc vi / thanh vien dang bat, de nguoi dung biet vi sao so it hon ho nghi. */
  scopeNote?: string
}) {
  const items = useMemo(
    () => (slice ? categoryTransactions(rows, slice.categoryId) : []),
    [rows, slice],
  )
  const total = useMemo(() => items.reduce((sum, t) => sum + t.amount, 0), [items])

  if (!slice) return null

  const period =
    range === 'all'
      ? RANGE_LABELS.all
      : `${dayjs(from).format('DD/MM/YYYY')} – ${dayjs(to).format('DD/MM/YYYY')}`

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span>{slice.icon}</span>
          <span className="truncate">{slice.name}</span>
        </span>
      }
    >
      <div className="mb-4 rounded-2xl bg-ink-200/40 px-4 py-3 dark:bg-white/5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Tổng chi</p>
        <p className="mt-0.5 text-2xl font-extrabold tabular-nums">{formatMoney(total)}</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
          {items.length} giao dịch · {period}
          {scopeNote && ` · ${scopeNote}`}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={slice.icon}
          title="Không còn giao dịch nào"
          hint="Có thể khoản cuối cùng vừa được đổi sang danh mục khác."
        />
      ) : (
        <TransactionGroups rows={items} showDayTotal={false} />
      )}
    </Sheet>
  )
}
