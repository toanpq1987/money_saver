import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { SubHeader } from '@/components/AppShell'
import { Field, MoneyInput, ProgressBar, Sheet, Spinner, useToast } from '@/components/ui'
import { useApp } from '@/hooks/useApp'
import { useMonthData } from '@/hooks/useMonthData'
import { errorMessage } from '@/lib/errors'
import { dayjs, formatCompact, formatMoney, formatMonthLabel, monthKey, pct } from '@/lib/format'
import { useBudgets, useSaveBudget } from '@/lib/queries'
import { useUI } from '@/lib/store'
import type { Category } from '@/lib/types'

export default function Budgets() {
  const { categories, household } = useApp()
  const { month, setMonth } = useUI()
  const { byCategory, stats } = useMonthData()
  const budgetsQ = useBudgets(month, true)
  const saveBudget = useSaveBudget()
  const toast = useToast()

  const [editing, setEditing] = useState<Category | null>(null)
  const [draft, setDraft] = useState(0)

  const budgetMap = useMemo(
    () => new Map((budgetsQ.data ?? []).map((b) => [b.category_id, b.amount])),
    [budgetsQ.data],
  )
  const spentMap = useMemo(
    () => new Map(byCategory.map((c) => [c.categoryId, c.total])),
    [byCategory],
  )

  const expenseCategories = categories.filter((c) => !c.archived && c.kind === 'expense')
  const totalBudget = [...budgetMap.values()].reduce((s, v) => s + v, 0)
  const used = pct(stats.expense, totalBudget)
  const remaining = totalBudget - stats.expense

  const daysLeft = Math.max(0, dayjs(month).endOf('month').diff(dayjs(), 'day'))
  const isCurrentMonth = month === monthKey(new Date())

  const open = (c: Category) => {
    setEditing(c)
    setDraft(budgetMap.get(c.id) ?? 0)
  }

  const submit = async () => {
    if (!editing || !household) return
    try {
      await saveBudget.mutateAsync({
        household_id: household.id,
        category_id: editing.id,
        month,
        amount: draft,
      })
      toast(draft > 0 ? 'Đã đặt ngân sách' : 'Đã bỏ ngân sách')
      setEditing(null)
    } catch (e) {
      toast(errorMessage(e, 'Lưu thất bại'), 'error')
    }
  }

  return (
    <div className="page-pad">
      <SubHeader title="Ngân sách" subtitle={formatMonthLabel(month)} />

      <div className="space-y-4 px-4">
        <div className="flex gap-2">
          <button
            className="btn-ghost flex-1 py-2 text-sm"
            onClick={() => setMonth(monthKey(dayjs(month).subtract(1, 'month')))}
          >
            ← Tháng trước
          </button>
          <button
            className="btn-ghost flex-1 py-2 text-sm"
            disabled={isCurrentMonth}
            onClick={() => setMonth(monthKey(dayjs(month).add(1, 'month')))}
          >
            Tháng sau →
          </button>
        </div>

        <section className="card p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold">Tổng ngân sách</h2>
            <span
              className={clsx('font-bold tabular-nums', used > 100 ? 'text-red-500' : 'text-ink-500')}
            >
              {totalBudget > 0 ? `${used}%` : '—'}
            </span>
          </div>

          {totalBudget > 0 ? (
            <>
              <div className="mt-3">
                <ProgressBar value={used} danger={used > 100} />
              </div>
              <p className="mt-2 text-[14px] text-ink-500">
                Đã chi <b className="text-ink-950 dark:text-ink-100">{formatMoney(stats.expense)}</b>{' '}
                / {formatMoney(totalBudget)}
              </p>
              <p className="mt-1 text-[14px]">
                {remaining >= 0 ? (
                  <>
                    Còn lại <b className="text-emerald-600 dark:text-emerald-400">{formatMoney(remaining)}</b>
                    {isCurrentMonth && daysLeft > 0 && (
                      <span className="text-ink-500">
                        {' '}
                        · ~{formatCompact(remaining / daysLeft)}/ngày trong {daysLeft} ngày còn lại
                      </span>
                    )}
                  </>
                ) : (
                  <b className="text-red-500">Đã vượt {formatMoney(-remaining)} ⚠️</b>
                )}
              </p>
            </>
          ) : (
            <p className="mt-2 text-[14px] text-ink-500">
              Chưa đặt ngân sách nào. Bấm vào một danh mục bên dưới để đặt hạn mức cho tháng này.
            </p>
          )}
        </section>

        <section className="card divide-y divide-ink-200/60 overflow-hidden dark:divide-white/5">
          {expenseCategories.map((c) => {
            const budget = budgetMap.get(c.id) ?? 0
            const spent = spentMap.get(c.id) ?? 0
            const p = pct(spent, budget)
            const over = budget > 0 && spent > budget

            return (
              <button
                key={c.id}
                onClick={() => open(c)}
                className="w-full px-4 py-3.5 text-left transition active:bg-ink-100 dark:active:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg"
                    style={{ background: `${c.color}22` }}
                  >
                    {c.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{c.name}</span>
                  <span className="shrink-0 text-right">
                    {budget > 0 ? (
                      <>
                        <span
                          className={clsx(
                            'block text-[14px] font-bold tabular-nums',
                            over && 'text-red-500',
                          )}
                        >
                          {formatCompact(spent)} / {formatCompact(budget)}
                        </span>
                        <span className="text-[12px] text-ink-500">{p}%</span>
                      </>
                    ) : (
                      <span className="text-[13px] text-ink-400">
                        {spent > 0 ? `Đã chi ${formatCompact(spent)}` : 'Chưa đặt'}
                      </span>
                    )}
                  </span>
                </div>
                {budget > 0 && (
                  <div className="mt-2">
                    <ProgressBar value={p} color={c.color} danger={over} />
                  </div>
                )}
              </button>
            )
          })}
        </section>
      </div>

      <Sheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Ngân sách ${editing.name}` : ''}
        footer={
          <button className="btn-primary w-full" disabled={saveBudget.isPending} onClick={submit}>
            {saveBudget.isPending && <Spinner />}
            {draft > 0 ? 'Lưu ngân sách' : 'Bỏ ngân sách'}
          </button>
        }
      >
        <Field label="Hạn mức mỗi tháng" hint="Đặt về 0 để bỏ ngân sách cho danh mục này">
          <MoneyInput value={draft} onChange={setDraft} autoFocus />
        </Field>
        {editing && (
          <p className="text-[14px] text-ink-500">
            Tháng này đã chi <b>{formatMoney(spentMap.get(editing.id) ?? 0)}</b> cho{' '}
            {editing.icon} {editing.name}.
          </p>
        )}
      </Sheet>
    </div>
  )
}
