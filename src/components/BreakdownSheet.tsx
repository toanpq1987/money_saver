import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { EmptyState, Sheet } from '@/components/ui'
import { TransactionGroups } from '@/components/TransactionList'
import { summariseRows } from '@/hooks/useMonthData'
import { formatMoney } from '@/lib/format'
import type { Transaction } from '@/lib/types'

/**
 * Mo mot con so tren man Thong ke ra thanh nhung giao dich da lam nen no.
 *
 * KHONG tu di hoi may chu. Nhan thang mang `rows` ma cho goi dang dung - da loc
 * san theo khoang thoi gian, theo vi va theo thanh vien. Neu o day tu truy van
 * lai thi chi can mot bo loc bi bo quen la tong trong sheet lech voi con so
 * tren dong vua bam.
 *
 * Tong cung duoc cong lai tu chinh danh sach ben duoi chu khong nhan san tu ben
 * ngoai, de sau khi nguoi dung sua mot khoan ngay trong sheet thi phan dau va
 * phan than khong bao gio cai nhau.
 */
export function BreakdownSheet({
  open,
  onClose,
  icon,
  title,
  rows,
  periodLabel,
  scopeNote,
}: {
  open: boolean
  onClose: () => void
  icon?: ReactNode
  title: string
  rows: Transaction[]
  /** Khoang thoi gian dang xem, viet ra chu. */
  periodLabel: string
  /** Bo loc vi / thanh vien dang bat, de nguoi dung biet vi sao so it hon ho nghi. */
  scopeNote?: string
}) {
  const summary = useMemo(() => summariseRows(rows), [rows])

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate">{title}</span>
        </span>
      }
    >
      <div className="mb-4 rounded-2xl bg-ink-200/40 px-4 py-3 dark:bg-white/5">
        {summary.kind === 'mixed' ? (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Figure label="Thu" value={summary.income} tone="text-emerald-600 dark:text-emerald-400" />
            <Figure label="Chi" value={summary.expense} tone="text-red-500" />
            <Figure
              label="Chênh lệch"
              value={summary.net}
              signed
              tone={summary.net < 0 ? 'text-red-500' : undefined}
            />
          </div>
        ) : (
          <Figure
            large
            label={summary.kind === 'income' ? 'Tổng thu' : 'Tổng chi'}
            value={summary.kind === 'income' ? summary.income : summary.expense}
          />
        )}
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
          {rows.length} giao dịch · {periodLabel}
          {scopeNote && ` · ${scopeNote}`}
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Không còn giao dịch nào"
          hint="Có thể khoản cuối cùng vừa được sửa hoặc xoá."
        />
      ) : (
        <TransactionGroups rows={rows} showDayTotal={summary.kind === 'mixed'} />
      )}
    </Sheet>
  )
}

function Figure({
  label,
  value,
  tone,
  signed,
  large,
}: {
  label: string
  value: number
  tone?: string
  signed?: boolean
  large?: boolean
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">{label}</p>
      <p
        className={
          large
            ? `mt-0.5 text-2xl font-extrabold tabular-nums ${tone ?? ''}`
            : `mt-0.5 text-[15px] font-bold tabular-nums ${tone ?? ''}`
        }
      >
        {formatMoney(value, signed ? { sign: true } : undefined)}
      </p>
    </div>
  )
}
