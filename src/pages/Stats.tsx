import clsx from 'clsx'
import { Table2, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MemberTabs, PageHeader } from '@/components/AppShell'
import { EmptyState, ProgressBar, Spinner } from '@/components/ui'
import { useApp } from '@/hooks/useApp'
import { useChartTokens } from '@/hooks/useChartTokens'
import { useMonthData, useTrend } from '@/hooks/useMonthData'
import { dayjs, formatCompact, formatMoney, pct } from '@/lib/format'
import { useUI } from '@/lib/store'

export default function Stats() {
  const { members } = useApp()
  const { month, member } = useUI()
  const { rows, all, stats, byCategory, isLoading } = useMonthData()
  const trend = useTrend(6)
  const t = useChartTokens()
  const [showTable, setShowTable] = useState(false)

  // Chi tieu theo tung ngay trong thang
  const daily = useMemo(() => {
    const days = dayjs(month).daysInMonth()
    const buckets = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      label: String(i + 1),
      expense: 0,
    }))
    for (const tx of rows) {
      if (tx.type !== 'expense') continue
      const d = dayjs(tx.occurred_at).date()
      if (buckets[d - 1]) buckets[d - 1].expense += tx.amount
    }
    return buckets
  }, [rows, month])

  // So sanh giua cac thanh vien (chi tinh khoan chi)
  const byMember = useMemo(() => {
    const map = new Map<string, { expense: number; income: number }>()
    for (const tx of all) {
      if (tx.type === 'transfer') continue
      const cur = map.get(tx.payer_id) ?? { expense: 0, income: 0 }
      if (tx.type === 'expense') cur.expense += tx.amount
      else cur.income += tx.amount
      map.set(tx.payer_id, cur)
    }
    return members.map((m, i) => ({
      id: m.id,
      name: m.display_name,
      emoji: m.avatar_emoji,
      color: m.color || t.memberFallback[i % 2],
      ...(map.get(m.id) ?? { expense: 0, income: 0 }),
    }))
  }, [all, members, t.memberFallback])

  const maxDaily = Math.max(...daily.map((d) => d.expense), 1)
  const avgDaily = stats.expense / dayjs(month).daysInMonth()
  const topCategory = byCategory[0]

  if (isLoading) {
    return (
      <div className="page-pad">
        <PageHeader title="Thống kê" showMonth />
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-ink-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="page-pad">
      <PageHeader title="Thống kê" showMonth />
      <MemberTabs />

      <div className="space-y-4 px-4">
        {/* Ba con so dau bang */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { label: 'Thu', value: stats.income, tone: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Chi', value: stats.expense, tone: 'text-red-500' },
            {
              label: 'Còn lại',
              value: stats.net,
              tone: stats.net >= 0 ? 'text-ink-950 dark:text-white' : 'text-red-500',
            },
          ].map((s) => (
            <div key={s.label} className="card p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
                {s.label}
              </p>
              <p className={clsx('mt-1 text-[17px] font-extrabold tabular-nums', s.tone)}>
                {formatCompact(s.value)}
              </p>
            </div>
          ))}
        </section>

        {stats.expense === 0 && stats.income === 0 ? (
          <div className="card">
            <EmptyState
              icon="📊"
              title="Chưa có dữ liệu tháng này"
              hint="Ghi vài giao dịch rồi quay lại, biểu đồ sẽ hiện ngay."
            />
          </div>
        ) : (
          <>
            {/* Xu huong 6 thang */}
            <section className="card p-4">
              <div className="mb-1 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-bold">
                  <TrendingUp size={18} className="text-ink-400" />
                  Xu hướng 6 tháng
                </h2>
                <button
                  onClick={() => setShowTable((v) => !v)}
                  aria-label="Xem dạng bảng"
                  className={clsx(
                    'rounded-lg p-2 transition',
                    showTable ? 'bg-brand-600 text-white' : 'text-ink-400 hover:bg-ink-200/60 dark:hover:bg-white/5',
                  )}
                >
                  <Table2 size={16} />
                </button>
              </div>

              {showTable ? (
                <div className="-mx-1 overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-left text-ink-500">
                        <th className="py-2 font-semibold">Tháng</th>
                        <th className="py-2 text-right font-semibold">Thu</th>
                        <th className="py-2 text-right font-semibold">Chi</th>
                        <th className="py-2 text-right font-semibold">Còn lại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-200/60 tabular-nums dark:divide-white/5">
                      {trend.buckets.map((b) => (
                        <tr key={b.key}>
                          <td className="py-2 font-semibold">{b.label}</td>
                          <td className="py-2 text-right">{formatCompact(b.income)}</td>
                          <td className="py-2 text-right">{formatCompact(b.expense)}</td>
                          <td className="py-2 text-right font-semibold">
                            {formatCompact(b.income - b.expense)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="-ml-3 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend.buckets} barGap={2} margin={{ top: 12, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke={t.grid} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={{ stroke: t.axis }}
                        tick={{ fill: t.muted, fontSize: 11 }}
                      />
                      <YAxis
                        width={44}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: t.muted, fontSize: 11 }}
                        tickFormatter={(v: number) => formatCompact(v)}
                      />
                      <Tooltip
                        cursor={{ fill: t.grid, opacity: 0.4 }}
                        content={<MoneyTooltip bg={t.tooltipBg} fg={t.tooltipText} />}
                      />
                      <Legend
                        verticalAlign="top"
                        height={28}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                          <span style={{ color: t.muted, fontSize: 12, fontWeight: 600 }}>{value}</span>
                        )}
                      />
                      <Bar dataKey="income" name="Thu" fill={t.income} radius={[4, 4, 0, 0]} maxBarSize={18} />
                      <Bar dataKey="expense" name="Chi" fill={t.expense} radius={[4, 4, 0, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            {/* Chi tieu theo ngay */}
            <section className="card p-4">
              <h2 className="font-bold">Chi tiêu theo ngày</h2>
              <p className="mt-0.5 text-[13px] text-ink-500">
                Trung bình {formatMoney(avgDaily)}/ngày
              </p>
              <div className="-ml-3 mt-2 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke={t.grid} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={{ stroke: t.axis }}
                      tick={{ fill: t.muted, fontSize: 10 }}
                      interval={4}
                    />
                    <YAxis
                      width={44}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: t.muted, fontSize: 11 }}
                      tickFormatter={(v: number) => formatCompact(v)}
                    />
                    <Tooltip
                      cursor={{ fill: t.grid, opacity: 0.4 }}
                      labelFormatter={(l) => `Ngày ${l}`}
                      content={<MoneyTooltip bg={t.tooltipBg} fg={t.tooltipText} />}
                    />
                    <Bar dataKey="expense" name="Chi" radius={[3, 3, 0, 0]}>
                      {daily.map((d) => (
                        <Cell key={d.day} fill={t.magnitude(d.expense / maxDaily)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Bang xep hang danh muc - danh tinh den tu icon + ten, khong phai mau */}
            {byCategory.length > 0 && (
              <section className="card p-4">
                <h2 className="font-bold">Cơ cấu chi tiêu</h2>
                {topCategory && (
                  <p className="mt-0.5 text-[13px] text-ink-500">
                    {topCategory.icon} {topCategory.name} chiếm nhiều nhất —{' '}
                    {Math.round(topCategory.share)}% tổng chi
                  </p>
                )}
                <ul className="mt-4 space-y-3.5">
                  {byCategory.map((c) => (
                    <li key={c.categoryId}>
                      <div className="mb-1.5 flex items-baseline gap-2">
                        <span className="text-base leading-none">{c.icon}</span>
                        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                          {c.name}
                        </span>
                        <span className="text-[13px] text-ink-500 tabular-nums">
                          {Math.round(c.share)}%
                        </span>
                        <span className="text-[14px] font-bold tabular-nums">
                          {formatCompact(c.total)}
                        </span>
                      </div>
                      <ProgressBar
                        value={c.share}
                        color={t.magnitude(c.total / (byCategory[0]?.total || 1))}
                      />
                      <p className="mt-1 text-[12px] text-ink-500">{c.count} giao dịch</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* So sanh giua vo & chong */}
            {members.length > 1 && member === 'all' && (
              <section className="card p-4">
                <h2 className="font-bold">Ai chi nhiều hơn</h2>
                <div className="mt-3 space-y-4">
                  {byMember.map((m) => {
                    const share = pct(m.expense, stats.expense)
                    return (
                      <div key={m.id}>
                        <div className="mb-1.5 flex items-baseline gap-2">
                          <span>{m.emoji}</span>
                          <span className="flex-1 truncate text-[14px] font-semibold">{m.name}</span>
                          <span className="text-[13px] text-ink-500 tabular-nums">{share}%</span>
                          <span className="text-[14px] font-bold tabular-nums">
                            {formatCompact(m.expense)}
                          </span>
                        </div>
                        <ProgressBar value={share} color={m.color} />
                        <p className="mt-1 text-[12px] text-ink-500">
                          Thu: {formatCompact(m.income)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/** Tooltip hien so tien day du thay vi so rut gon tren truc. */
function MoneyTooltip({
  active,
  payload,
  label,
  labelFormatter,
  bg,
  fg,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string | number
  labelFormatter?: (l: string | number) => string
  bg: string
  fg: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2 text-[12px] shadow-lg"
      style={{ background: bg, color: fg }}
    >
      <p className="mb-1 font-bold opacity-70">
        {labelFormatter && label !== undefined ? labelFormatter(label) : label}
      </p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 whitespace-nowrap">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: p.color }}
            aria-hidden
          />
          <span className="opacity-80">{p.name}</span>
          <b className="ml-auto tabular-nums">{formatMoney(p.value ?? 0)}</b>
        </p>
      ))}
    </div>
  )
}
