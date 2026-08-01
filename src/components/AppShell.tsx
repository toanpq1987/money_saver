import clsx from 'clsx'
import { BarChart3, ChevronLeft, ChevronRight, Home, PiggyBank, Plus, Receipt, Settings2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { dayjs, formatMonthLabel, monthKey } from '@/lib/format'
import { useUI } from '@/lib/store'
import { useApp } from '@/hooks/useApp'
import { SyncStatus } from './SyncStatus'
import { TransactionSheet } from './TransactionSheet'

const TABS = [
  { to: '/', label: 'Tổng quan', icon: Home, end: true },
  { to: '/transactions', label: 'Giao dịch', icon: Receipt },
  { to: '/stats', label: 'Thống kê', icon: BarChart3 },
  { to: '/savings', label: 'Tiết kiệm', icon: PiggyBank },
  { to: '/more', label: 'Thêm', icon: Settings2 },
]

export function AppShell() {
  const [adding, setAdding] = useState(false)

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg">
      <Outlet />

      <SyncStatus />

      {/* Nut them giao dich - noi tren thanh dieu huong, bam theo mep phai cua khung app */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--sab)+1rem)] z-30 mx-auto flex max-w-lg justify-end px-4">
        <button
          onClick={() => setAdding(true)}
          aria-label="Thêm giao dịch"
          className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full
                     bg-brand-600 text-white shadow-xl shadow-brand-600/40 transition active:scale-90"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      </div>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-lg
                   border-t border-ink-200/70 bg-ink-50/85 backdrop-blur-xl
                   dark:border-white/10 dark:bg-ink-950/85"
      >
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition',
                isActive ? 'text-brand-600 dark:text-brand-400' : 'text-ink-400 dark:text-ink-500',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <TransactionSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tieu de trang + chon thang
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  subtitle,
  right,
  showMonth = false,
}: {
  title: string
  subtitle?: ReactNode
  right?: ReactNode
  showMonth?: boolean
}) {
  const { month, setMonth } = useUI()
  const isCurrentMonth = month === monthKey(new Date())

  return (
    <header className="safe-top sticky top-0 z-20 bg-ink-50/85 px-4 pb-3 backdrop-blur-xl dark:bg-ink-950/85">
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="min-w-0">
          <h1 className="truncate text-[26px] font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-sm text-ink-500">{subtitle}</p>}
        </div>
        {right}
      </div>

      {showMonth && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setMonth(monthKey(dayjs(month).subtract(1, 'month')))}
            aria-label="Tháng trước"
            className="rounded-xl bg-ink-200/60 p-2 text-ink-600 transition active:scale-90 dark:bg-white/5 dark:text-ink-300"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex-1 text-center">
            <p className="text-[15px] font-bold">{formatMonthLabel(month)}</p>
          </div>

          <button
            onClick={() => setMonth(monthKey(dayjs(month).add(1, 'month')))}
            aria-label="Tháng sau"
            disabled={isCurrentMonth}
            className="rounded-xl bg-ink-200/60 p-2 text-ink-600 transition active:scale-90 disabled:opacity-30 dark:bg-white/5 dark:text-ink-300"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </header>
  )
}

/** Tieu de cho cac trang con trong muc "Thêm", co nut quay lai. */
export function SubHeader({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <header className="safe-top sticky top-0 z-20 flex items-center gap-3 bg-ink-50/85 px-4 pb-3 pt-2 backdrop-blur-xl dark:bg-ink-950/85">
      <button
        onClick={() => navigate(-1)}
        aria-label="Quay lại"
        className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-600 transition active:scale-90 dark:text-ink-300"
      >
        <ChevronLeft size={24} />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-[13px] text-ink-500">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}

// ---------------------------------------------------------------------------
// Tab rieng cua vo & chong
// ---------------------------------------------------------------------------

export function MemberTabs() {
  const { members } = useApp()
  const { member, setMember } = useUI()

  if (members.length < 2) return null

  const items = [{ id: 'all', label: 'Cả nhà', emoji: '👨‍👩‍👧', color: '#328ffb' }].concat(
    members.map((m) => ({
      id: m.id,
      label: m.display_name,
      emoji: m.avatar_emoji,
      color: m.color,
    })),
  )

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
      {items.map((it) => {
        const active = member === it.id
        return (
          <button
            key={it.id}
            onClick={() => setMember(it.id)}
            className={clsx(
              'chip',
              active
                ? 'text-white shadow-md'
                : 'bg-ink-200/60 text-ink-600 dark:bg-white/5 dark:text-ink-300',
            )}
            style={active ? { background: it.color } : undefined}
          >
            <span>{it.emoji}</span>
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
