import clsx from 'clsx'
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  Eye,
  EyeOff,
  Scale,
  Target,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MemberTabs, PageHeader } from '@/components/AppShell'
import { TransactionGroups } from '@/components/TransactionList'
import { TransferSheet } from '@/components/TransferSheet'
import { EmptyState, ProgressBar, Spinner } from '@/components/ui'
import { useApp } from '@/hooks/useApp'
import { useMonthData, useWalletFlow } from '@/hooks/useMonthData'
import { dayjs, formatCompact, formatMoney, pct } from '@/lib/format'
import { useBills, useBudgets, useGoals, useSavingsEntries } from '@/lib/queries'
import { useUI } from '@/lib/store'

/** Mot dong trong bang dong tien cua vi rieng. */
function FlowRow({ label, value, tone }: { label: string; value: number; tone: 'in' | 'out' }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd
        className={clsx(
          'font-semibold tabular-nums',
          tone === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-950 dark:text-ink-100',
        )}
      >
        {tone === 'in' ? '+' : '−'}
        {formatMoney(value)}
      </dd>
    </div>
  )
}

export default function Home() {
  const { accounts, balanceOf, members, memberById, household, profile } = useApp()
  const { month, member } = useUI()
  const { rows, stats, byCategory, sharedByPayer, isLoading } = useMonthData()
  const [hideBalance, setHideBalance] = useState(false)
  const [transferring, setTransferring] = useState(false)

  const budgetsQ = useBudgets(month, true)
  const billsQ = useBills(true)
  const goalsQ = useGoals(true)
  const entriesQ = useSavingsEntries(true)

  // So du: ca nha, hoac rieng vi cua nguoi dang chon
  const { balance, balanceLabel } = useMemo(() => {
    const live = accounts.filter((a) => !a.archived)
    if (member === 'all') {
      return {
        balance: live.reduce((s, a) => s + balanceOf(a.id), 0),
        balanceLabel: 'Tổng số dư gia đình',
      }
    }
    const own = live.filter((a) => a.owner_id === member)
    return {
      balance: own.reduce((s, a) => s + balanceOf(a.id), 0),
      balanceLabel: `Ví của ${memberById(member)?.display_name ?? 'bạn'}`,
    }
  }, [accounts, balanceOf, member, memberById])

  // "Ví của tôi" = moi tai khoan minh dung ten (tien mat, the, vi dien tu...)
  const myAccounts = useMemo(
    () => accounts.filter((a) => !a.archived && a.owner_id === profile?.id),
    [accounts, profile?.id],
  )
  const myWallets = useMemo(() => myAccounts.map((a) => a.id), [myAccounts])
  const myFlow = useWalletFlow(myWallets)

  const budgetTotal = (budgetsQ.data ?? []).reduce((s, b) => s + b.amount, 0)
  const budgetUsed = pct(stats.expense, budgetTotal)

  const savedTotal = useMemo(() => {
    const entries = entriesQ.data ?? []
    return entries.reduce((s, e) => s + (e.direction === 'in' ? e.amount : -e.amount), 0)
  }, [entriesQ.data])

  const upcomingBills = useMemo(() => {
    const bills = (billsQ.data ?? []).filter((b) => b.active)
    const today = dayjs()
    return bills
      .map((b) => {
        const due = dayjs(`${today.format('YYYY-MM')}-01`).date(
          Math.min(b.day_of_month, today.daysInMonth()),
        )
        const paidThisMonth = b.last_paid_on && dayjs(b.last_paid_on).isSame(today, 'month')
        return { bill: b, due, daysLeft: due.diff(today, 'day'), paidThisMonth }
      })
      .filter((x) => !x.paidThisMonth && x.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft)
  }, [billsQ.data])

  // Can doi: ai dang ung nhieu hon cho cac khoan chung
  const settle = useMemo(() => {
    if (member !== 'all' || members.length !== 2) return null
    const [a, b] = members
    const pa = sharedByPayer.get(a.id) ?? 0
    const pb = sharedByPayer.get(b.id) ?? 0
    const diff = (pa - pb) / 2
    if (Math.abs(diff) < 1000) return null
    return diff > 0
      ? { from: b, to: a, amount: diff, paidA: pa, paidB: pb }
      : { from: a, to: b, amount: -diff, paidA: pa, paidB: pb }
  }, [member, members, sharedByPayer])

  const recent = rows.slice(0, 8)

  return (
    <div className="page-pad">
      <PageHeader
        title={household?.name ?? 'Tổng quan'}
        showMonth
        right={
          <Link
            to="/more/settings"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-200/60 text-lg dark:bg-white/5"
          >
            {profile?.avatar_emoji ?? '⚙️'}
          </Link>
        }
      />

      <MemberTabs />

      <div className="space-y-4 px-4">
        {/* So du */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-xl shadow-brand-600/20">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-white/70">
              {balanceLabel}
            </p>
            <button
              onClick={() => setHideBalance((v) => !v)}
              aria-label={hideBalance ? 'Hiện số dư' : 'Ẩn số dư'}
              className="rounded-full p-1.5 text-white/70 transition active:scale-90"
            >
              {hideBalance ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <p className="mt-1 text-[34px] font-extrabold tracking-tight tabular-nums">
            {hideBalance ? '••••••' : formatMoney(balance)}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-white/70">
                <ArrowDownLeft size={14} /> Thu tháng này
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">{formatMoney(stats.income)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-white/70">
                <ArrowUpRight size={14} /> Chi tháng này
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">{formatMoney(stats.expense)}</p>
            </div>
          </div>

          <p className="mt-3 text-[13px] font-medium text-white/70">
            Thu − chi tháng này:{' '}
            <b className={stats.net >= 0 ? 'text-emerald-300' : 'text-red-300'}>
              {formatMoney(stats.net, { sign: true })}
            </b>
          </p>
        </section>

        {/* Vi cua chinh minh - gom moi tai khoan dung ten minh, tinh theo VI chu khong theo nguoi chi */}
        {myWallets.length > 0 ? (
          <section className="card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="flex items-center gap-2 font-bold">
                <Wallet size={18} className="text-ink-400" />
                Ví của tôi
              </h2>
              <span className="text-xl font-extrabold tabular-nums">
                {hideBalance ? '••••' : formatMoney(myFlow.balance)}
              </span>
            </div>

            {/* Cac tai khoan nam trong vi nay */}
            <ul className="mt-2.5 space-y-1 text-[13px]">
              {myAccounts.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/more/accounts/${a.id}`}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="min-w-0 truncate text-ink-500">
                      {a.icon} {a.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-ink-500">
                      {hideBalance ? '••••' : formatMoney(balanceOf(a.id))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <dl className="mt-3 space-y-1.5 text-[14px]">
              {myFlow.income > 0 && (
                <FlowRow label="Thu vào tháng này" value={myFlow.income} tone="in" />
              )}
              {myFlow.transferIn > 0 && (
                <FlowRow label="Nhận chuyển khoản" value={myFlow.transferIn} tone="in" />
              )}
              {myFlow.transferOut > 0 && (
                <FlowRow label="Chuyển sang ví khác" value={myFlow.transferOut} tone="out" />
              )}
              {myFlow.expense > 0 && (
                <FlowRow label="Đã chi tiêu" value={myFlow.expense} tone="out" />
              )}
            </dl>

            {/*
              Day la MUC THAY DOI trong thang, khong phai "con lai".
              So con lai that su la so du o dau the. Goi nham thanh "con lai"
              khien thang nao chi nhieu hon thu se doc ra thanh dang am tien,
              trong khi vi van con so du.
            */}
            <div className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-ink-200/60 pt-2.5 dark:border-white/10">
              <span className="text-[14px] font-semibold text-ink-500">
                {myFlow.net >= 0 ? 'Tháng này tăng' : 'Tháng này giảm'}
              </span>
              <span
                className={clsx(
                  'font-bold tabular-nums',
                  myFlow.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500',
                )}
              >
                {formatMoney(Math.abs(myFlow.net))}
              </span>
            </div>

            {/* Chia luong ra cac tai khoan: ghi thanh khoan chuyen, khong doi Thu / Chi */}
            {accounts.filter((a) => !a.archived).length > 1 && (
              <button
                className="btn-ghost mt-3 w-full py-2.5 text-sm"
                onClick={() => setTransferring(true)}
              >
                <ArrowRightLeft size={16} /> Chuyển / chia tiền giữa tài khoản
              </button>
            )}
          </section>
        ) : (
          <Link to="/more/accounts" className="card flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-600/10 text-brand-600 dark:text-brand-400">
              <Wallet size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">Tạo ví của riêng bạn</span>
              <span className="block text-[13px] text-ink-500">
                Thêm tài khoản đứng tên bạn để tách tiền riêng khỏi tiền chung của nhà
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-ink-400" />
          </Link>
        )}

        {/* Ngan sach */}
        {budgetTotal > 0 && (
          <Link to="/more/budgets" className="card block p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">Ngân sách tháng</h2>
              <span
                className={clsx(
                  'text-sm font-bold tabular-nums',
                  budgetUsed > 100 ? 'text-red-500' : 'text-ink-500',
                )}
              >
                {budgetUsed}%
              </span>
            </div>
            <div className="mt-3">
              <ProgressBar value={budgetUsed} danger={budgetUsed > 100} />
            </div>
            <p className="mt-2 text-[13px] text-ink-500">
              Đã chi {formatCompact(stats.expense)} / {formatCompact(budgetTotal)}
              {budgetUsed > 100 ? ' — đã vượt ngân sách ⚠️' : ''}
            </p>
          </Link>
        )}

        {/* Can doi vo chong */}
        {settle && (
          <section className="card p-4">
            <h2 className="flex items-center gap-2 font-bold">
              <Scale size={18} className="text-ink-400" />
              Cân đối khoản chung
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed">
              <b style={{ color: settle.from.color }}>
                {settle.from.avatar_emoji} {settle.from.display_name}
              </b>{' '}
              nên đưa{' '}
              <b style={{ color: settle.to.color }}>
                {settle.to.avatar_emoji} {settle.to.display_name}
              </b>{' '}
              <b className="tabular-nums">{formatMoney(settle.amount)}</b> để chia đều chi tiêu
              chung tháng này.
            </p>
          </section>
        )}

        {/* Hoa don sap den han */}
        {upcomingBills.length > 0 && (
          <section className="card overflow-hidden">
            <h2 className="flex items-center gap-2 px-4 pt-4 font-bold">
              <CalendarClock size={18} className="text-amber-500" />
              Sắp đến hạn
            </h2>
            <div className="mt-2 divide-y divide-ink-200/60 dark:divide-white/5">
              {upcomingBills.map(({ bill, daysLeft }) => (
                <Link
                  key={bill.id}
                  to="/more/bills"
                  className="flex items-center gap-3 px-4 py-3 transition active:bg-ink-100 dark:active:bg-white/5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{bill.name}</span>
                    <span className="text-[13px] text-ink-500">
                      {daysLeft <= 0 ? 'Đến hạn hôm nay' : `Còn ${daysLeft} ngày`}
                    </span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">{formatMoney(bill.amount)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Top danh muc */}
        {byCategory.length > 0 && (
          <section className="card p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Chi nhiều nhất</h2>
              <Link to="/stats" className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                Xem tất cả
              </Link>
            </div>
            <div className="mt-3 space-y-3">
              {byCategory.slice(0, 4).map((c) => (
                <div key={c.categoryId}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span>{c.icon}</span>
                    <span className="flex-1 truncate text-[14px] font-semibold">{c.name}</span>
                    <span className="text-[14px] font-bold tabular-nums">
                      {formatMoney(c.total)}
                    </span>
                  </div>
                  <ProgressBar value={c.share} color={c.color} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quy tiet kiem */}
        {(goalsQ.data ?? []).length > 0 && (
          <Link to="/savings" className="card flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600">
              <Target size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">Quỹ tiết kiệm</span>
              <span className="text-[13px] text-ink-500">
                Đã tích luỹ {formatMoney(savedTotal)} · {(goalsQ.data ?? []).length} mục tiêu
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-ink-400" />
          </Link>
        )}

        {/* Giao dich gan day */}
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="font-bold">Giao dịch gần đây</h2>
            <Link
              to="/transactions"
              className="text-sm font-semibold text-brand-600 dark:text-brand-400"
            >
              Tất cả
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-6 w-6 text-ink-400" />
            </div>
          ) : recent.length === 0 ? (
            <div className="card">
              <EmptyState
                icon="🧾"
                title="Chưa có giao dịch nào"
                hint="Bấm nút + màu xanh để ghi khoản chi đầu tiên của tháng."
              />
            </div>
          ) : (
            <TransactionGroups rows={recent} showDayTotal={false} />
          )}
        </section>
      </div>

      <TransferSheet open={transferring} onClose={() => setTransferring(false)} />
    </div>
  )
}
