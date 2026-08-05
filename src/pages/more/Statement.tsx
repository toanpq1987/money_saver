import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SubHeader } from '@/components/AppShell'
import { EmptyState, Segmented, Spinner } from '@/components/ui'
import { useApp } from '@/hooks/useApp'
import {
  cycleBounds,
  monthBounds,
  useAccountStatements,
  type AccountStatement,
} from '@/hooks/useStatement'
import { dateKey, dayjs, formatMoney, monthKey } from '@/lib/format'
import { groupAccountsByOwner } from '@/lib/wallets'
import { useUI } from '@/lib/store'

export default function Statement() {
  const { accounts, members, profile, categoryById } = useApp()
  const { month, setMonth, statementMode: mode, setStatementMode: setMode } = useUI()
  const { statementCycleDay: cycleDay, setStatementCycleDay: setCycleDay } = useUI()
  const [openId, setOpenId] = useState<string | null>(null)

  // Khoang tu chon giu o day chu khong vao store: no la hai moc ngay tuyet
  // doi, thang sau quay lai thi da cu meo, giu lai chi gay nham.
  const [custom, setCustom] = useState(() => monthBounds(monthKey(new Date())))

  const { from, to } = useMemo(() => {
    if (mode === 'custom') return custom
    if (mode === 'cycle') return cycleBounds(month, cycleDay)
    return monthBounds(month)
  }, [mode, month, cycleDay, custom])

  const { statements, isLoading } = useAccountStatements(from, to)

  const isCurrentMonth = month === monthKey(new Date())

  const byId = useMemo(
    () => new Map(statements.map((s) => [s.account.id, s])),
    [statements],
  )
  const groups = useMemo(
    () => groupAccountsByOwner(accounts, members, profile?.id),
    [accounts, members, profile?.id],
  )

  return (
    <div className="page-pad">
      <SubHeader
        title="Sao kê tài khoản"
        subtitle={`${dayjs(from).format('DD/MM/YYYY')} → ${dayjs(to).format('DD/MM/YYYY')}`}
      />

      <div className="space-y-4 px-4">
        <section className="card space-y-3 p-3">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'month', label: 'Theo tháng' },
              { value: 'cycle', label: 'Kỳ thẻ' },
              { value: 'custom', label: 'Tuỳ chọn' },
            ]}
          />

          {mode !== 'custom' && (
            <div className="flex gap-2">
              <button
                className="btn-ghost flex-1 py-2 text-sm"
                onClick={() => setMonth(monthKey(dayjs(month).subtract(1, 'month')))}
              >
                ← Kỳ trước
              </button>
              <button
                className="btn-ghost flex-1 py-2 text-sm"
                disabled={isCurrentMonth}
                onClick={() => setMonth(monthKey(dayjs(month).add(1, 'month')))}
              >
                Kỳ sau →
              </button>
            </div>
          )}

          {mode === 'cycle' && (
            <div>
              <label className="flex items-center gap-3 text-sm">
                <span className="shrink-0 text-ink-500">Kỳ bắt đầu ngày</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={28}
                  className="field w-20 py-2 text-center"
                  value={cycleDay}
                  onChange={(e) => setCycleDay(Number(e.target.value) || 24)}
                />
                <span className="text-ink-500">hằng tháng</span>
              </label>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
                Xem mặt sau thẻ hoặc sao kê ngân hàng gửi về để biết ngày chốt. Tối đa 28 để
                tháng nào cũng có ngày đó.
              </p>
            </div>
          )}

          {mode === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="label">Từ ngày</span>
                <input
                  type="date"
                  className="field py-2"
                  value={custom.from}
                  max={custom.to}
                  onChange={(e) => {
                    const next = e.target.value
                    if (!next) return
                    // Keo ngay dau vuot qua ngay cuoi thi day ngay cuoi theo,
                    // thay vi de nguoi dung nhin mot khoang rong vo nghia.
                    setCustom((c) => ({ from: next, to: next > c.to ? next : c.to }))
                  }}
                />
              </label>
              <label className="block">
                <span className="label">Đến ngày</span>
                <input
                  type="date"
                  className="field py-2"
                  value={custom.to}
                  min={custom.from}
                  onChange={(e) => {
                    const next = e.target.value
                    if (!next) return
                    setCustom((c) => ({ from: next < c.from ? next : c.from, to: next }))
                  }}
                />
              </label>
            </div>
          )}

          {mode === 'custom' && (
            <div className="flex flex-wrap gap-2">
              <QuickRange label="Tháng này" onPick={() => setCustom(monthBounds(monthKey(new Date())))} />
              <QuickRange
                label="Tháng trước"
                onPick={() => setCustom(monthBounds(monthKey(dayjs().subtract(1, 'month'))))}
              />
              <QuickRange
                label="30 ngày qua"
                onPick={() =>
                  setCustom({ from: dateKey(dayjs().subtract(29, 'day')), to: dateKey(dayjs()) })
                }
              />
            </div>
          )}
        </section>

        <p className="px-1 text-[13px] leading-relaxed text-ink-500">
          Số dư đầu kỳ + tiền vào − tiền ra = số dư cuối kỳ. Bấm vào một tài khoản để xem từng
          giao dịch kèm số dư luỹ kế, đối chiếu với sao kê ngân hàng.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6 text-ink-400" />
          </div>
        ) : statements.length === 0 ? (
          <div className="card">
            <EmptyState icon="🧾" title="Chưa có tài khoản nào" />
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.key}>
              <h2 className="mb-2 px-1 text-[13px] font-bold uppercase tracking-wide text-ink-500">
                {g.emoji} {g.name}
              </h2>
              <div className="space-y-3">
                {g.accounts.map((a) => {
                  const s = byId.get(a.id)
                  if (!s) return null
                  return (
                    <AccountCard
                      key={a.id}
                      statement={s}
                      open={openId === a.id}
                      onToggle={() => setOpenId(openId === a.id ? null : a.id)}
                      categoryName={(id) => categoryById(id)?.name ?? 'Chưa phân loại'}
                      categoryIcon={(id) => categoryById(id)?.icon ?? '📦'}
                    />
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}

function QuickRange({ label, onPick }: { label: string; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="chip bg-ink-100 text-ink-600 dark:bg-white/5 dark:text-ink-300"
    >
      {label}
    </button>
  )
}

function AccountCard({
  statement: s,
  open,
  onToggle,
  categoryName,
  categoryIcon,
}: {
  statement: AccountStatement
  open: boolean
  onToggle: () => void
  categoryName: (id: string | null) => string
  categoryIcon: (id: string | null) => string
}) {
  const quiet = s.rows.length === 0

  return (
    <section className="card overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3.5 text-left">
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-lg"
            style={{ background: `${s.account.color}22` }}
          >
            {s.account.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">{s.account.name}</span>
            <span className="block text-[13px] text-ink-500">
              {quiet ? 'Không có giao dịch' : `${s.rows.length} giao dịch`}
            </span>
          </span>
          <ChevronDown
            size={18}
            className={clsx('shrink-0 text-ink-400 transition-transform', open && 'rotate-180')}
          />
        </div>

        <dl className="mt-3 space-y-1.5 text-[14px]">
          <Line label="Số dư đầu kỳ" value={s.balanceStart} />
          <Line label="Tiền vào" value={s.inflow} tone="in" hideWhenZero />
          <Line label="Tiền ra" value={-s.outflow} tone="out" hideWhenZero />
        </dl>

        <div className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-ink-200/60 pt-2.5 dark:border-white/10">
          <span className="text-[14px] font-bold">Số dư cuối kỳ</span>
          <span
            className={clsx(
              'font-extrabold tabular-nums',
              s.balanceEnd < 0 && 'text-red-500',
            )}
          >
            {formatMoney(s.balanceEnd)}
          </span>
        </div>
      </button>

      {open && !quiet && (
        <div className="border-t border-ink-200/60 dark:border-white/10">
          {s.rows.map(({ tx, delta, balanceAfter }) => (
            <div
              key={tx.id}
              className="flex items-start gap-3 border-b border-ink-200/40 px-4 py-2.5 last:border-0 dark:border-white/5"
            >
              <span className="w-12 shrink-0 pt-0.5 text-[12px] tabular-nums text-ink-500">
                {dayjs(tx.occurred_at).format('DD/MM')}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">
                  {tx.type === 'transfer'
                    ? delta > 0
                      ? 'Nhận chuyển khoản'
                      : 'Chuyển đi'
                    : `${categoryIcon(tx.category_id)} ${categoryName(tx.category_id)}`}
                </span>
                {tx.note && <span className="block truncate text-[12px] text-ink-500">{tx.note}</span>}
              </span>
              <span className="shrink-0 text-right">
                <span
                  className={clsx(
                    'block text-[14px] font-bold tabular-nums',
                    delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : '',
                  )}
                >
                  {delta > 0 ? '+' : '−'}
                  {formatMoney(Math.abs(delta))}
                </span>
                <span className="block text-[12px] tabular-nums text-ink-500">
                  {formatMoney(balanceAfter)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Line({
  label,
  value,
  tone,
  hideWhenZero,
}: {
  label: string
  value: number
  tone?: 'in' | 'out'
  hideWhenZero?: boolean
}) {
  if (hideWhenZero && value === 0) return null
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd
        className={clsx(
          'font-semibold tabular-nums',
          tone === 'in' ? 'text-emerald-600 dark:text-emerald-400' : '',
          value < 0 && tone !== 'out' && 'text-red-500',
        )}
      >
        {tone === 'in' ? '+' : ''}
        {formatMoney(value)}
      </dd>
    </div>
  )
}
