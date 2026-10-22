import clsx from 'clsx'
import { ArrowRightLeft, Check, CloudOff } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '@/hooks/useApp'
import { groupByDay } from '@/hooks/useMonthData'
import { formatDayLabel, formatMoney } from '@/lib/format'
import type { Transaction } from '@/lib/types'
import { TransactionSheet } from './TransactionSheet'

export function TransactionRow({
  tx,
  onClick,
  selected,
  accountId,
}: {
  tx: Transaction
  onClick?: () => void
  /** Co gia tri = dang o che do chon nhieu, hien o tick ben trai. */
  selected?: boolean
  /**
   * Dang xem tu goc mot tai khoan: khoan chuyen hien dau +/- theo chieu tien
   * vao hay ra khoi tai khoan do, thay vi de trong nhu o danh sach chung.
   */
  accountId?: string
}) {
  const { categoryById, accountById, memberById, members } = useApp()
  const category = categoryById(tx.category_id)
  const payer = memberById(tx.payer_id)
  const account = accountById(tx.account_id)
  const toAccount = accountById(tx.to_account_id)

  const isTransfer = tx.type === 'transfer'
  const isIncome = tx.type === 'income'
  const transferIn = isTransfer && accountId !== undefined && tx.to_account_id === accountId
  const transferOut = isTransfer && accountId !== undefined && tx.account_id === accountId

  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-ink-100 dark:active:bg-white/5',
        selected && 'bg-brand-500/10',
      )}
    >
      {selected !== undefined && (
        <span
          className={clsx(
            'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition',
            selected
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-ink-300 dark:border-white/20',
          )}
        >
          {selected && <Check size={14} strokeWidth={3} />}
        </span>
      )}
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl"
        style={{
          background: isTransfer ? '#8595ae22' : `${category?.color ?? '#8595ae'}22`,
        }}
      >
        {isTransfer ? <ArrowRightLeft size={20} className="text-ink-500" /> : (category?.icon ?? '📦')}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-semibold">
            {isTransfer ? 'Chuyển tiền' : (category?.name ?? 'Chưa phân loại')}
          </span>
          {!isTransfer && !tx.is_shared && (
            <span className="shrink-0 rounded-md bg-ink-200/70 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-500 dark:bg-white/10">
              riêng
            </span>
          )}
          {tx._pending && (
            <span
              title="Đang chờ gửi lên máy chủ"
              className="flex shrink-0 items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400"
            >
              <CloudOff size={10} /> chờ gửi
            </span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-ink-500">
          {members.length > 1 && payer && !isTransfer && <span>{payer.avatar_emoji}</span>}
          <span className="truncate">
            {tx.note ||
              (isTransfer
                ? `${account?.name ?? '?'} → ${toAccount?.name ?? '?'}`
                : (account?.name ?? ''))}
          </span>
        </span>
      </span>

      <span
        className={clsx(
          'shrink-0 text-[15px] font-bold tabular-nums',
          transferIn
            ? 'text-emerald-600 dark:text-emerald-400'
            : isTransfer && !transferOut
              ? 'text-ink-400'
              : isIncome
                ? 'text-emerald-600 dark:text-emerald-400'
                : '',
        )}
      >
        {transferIn ? '+' : transferOut ? '-' : isTransfer ? '' : isIncome ? '+' : '-'}
        {formatMoney(tx.amount)}
      </span>
    </button>
  )
}

/** Danh sach giao dich nhom theo ngay, bam vao de sua. */
export function TransactionGroups({
  rows,
  showDayTotal = true,
}: {
  rows: Transaction[]
  showDayTotal?: boolean
}) {
  const [editing, setEditing] = useState<Transaction | null>(null)
  const groups = groupByDay(rows)

  return (
    <>
      <div className="space-y-3">
        {groups.map(([day, items]) => {
          const dayNet = items.reduce(
            (sum, t) =>
              t.type === 'income' ? sum + t.amount : t.type === 'expense' ? sum - t.amount : sum,
            0,
          )
          return (
            <section key={day} className="card overflow-hidden">
              <header className="flex items-baseline justify-between gap-3 px-4 pt-3">
                <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink-500">
                  {formatDayLabel(day)}
                </h3>
                {showDayTotal && (
                  <span
                    className={clsx(
                      'text-[13px] font-bold tabular-nums',
                      dayNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-500',
                    )}
                  >
                    {formatMoney(dayNet, { sign: true })}
                  </span>
                )}
              </header>
              <div className="mt-1 divide-y divide-ink-200/60 dark:divide-white/5">
                {items.map((t) => (
                  <TransactionRow key={t.id} tx={t} onClick={() => setEditing(t)} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <TransactionSheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        transaction={editing}
      />
    </>
  )
}
