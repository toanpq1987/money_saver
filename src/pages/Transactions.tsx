import clsx from 'clsx'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { MemberTabs, PageHeader } from '@/components/AppShell'
import { TransactionGroups } from '@/components/TransactionList'
import { EmptyState, Sheet, Spinner } from '@/components/ui'
import { useApp } from '@/hooks/useApp'
import { useMonthData } from '@/hooks/useMonthData'
import { formatMoney } from '@/lib/format'
import type { TxType } from '@/lib/types'

type TypeFilter = 'all' | TxType

export default function Transactions() {
  const { categories, categoryById } = useApp()
  const { rows, isLoading } = useMonthData()

  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [sharedOnly, setSharedOnly] = useState<'all' | 'shared' | 'private'>('all')
  const [filterOpen, setFilterOpen] = useState(false)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (categoryIds.length && (!t.category_id || !categoryIds.includes(t.category_id)))
        return false
      if (sharedOnly === 'shared' && (!t.is_shared || t.type === 'transfer')) return false
      if (sharedOnly === 'private' && (t.is_shared || t.type === 'transfer')) return false
      if (!needle) return true
      const cat = categoryById(t.category_id)?.name.toLowerCase() ?? ''
      return t.note.toLowerCase().includes(needle) || cat.includes(needle)
    })
  }, [rows, q, typeFilter, categoryIds, sharedOnly, categoryById])

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of filtered) {
      if (t.type === 'income') income += t.amount
      else if (t.type === 'expense') expense += t.amount
    }
    return { income, expense, count: filtered.length }
  }, [filtered])

  const activeFilters =
    (typeFilter !== 'all' ? 1 : 0) + (categoryIds.length ? 1 : 0) + (sharedOnly !== 'all' ? 1 : 0)

  return (
    <div className="page-pad">
      <PageHeader
        title="Giao dịch"
        showMonth
        right={
          <button
            onClick={() => setFilterOpen(true)}
            aria-label="Bộ lọc"
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-200/60 dark:bg-white/5"
          >
            <SlidersHorizontal size={18} />
            {activeFilters > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                {activeFilters}
              </span>
            )}
          </button>
        }
      />

      <MemberTabs />

      <div className="px-4 pb-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="field py-2.5 pl-11 pr-10"
            placeholder="Tìm theo ghi chú hoặc danh mục…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              onClick={() => setQ('')}
              aria-label="Xoá tìm kiếm"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="mx-4 mb-4 flex items-center justify-around rounded-2xl bg-ink-200/50 py-3 dark:bg-white/5">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase text-ink-500">Thu</p>
          <p className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatMoney(totals.income)}
          </p>
        </div>
        <div className="h-8 w-px bg-ink-300/50 dark:bg-white/10" />
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase text-ink-500">Chi</p>
          <p className="font-bold tabular-nums text-red-500">{formatMoney(totals.expense)}</p>
        </div>
        <div className="h-8 w-px bg-ink-300/50 dark:bg-white/10" />
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase text-ink-500">Số GD</p>
          <p className="font-bold tabular-nums">{totals.count}</p>
        </div>
      </div>

      <div className="px-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6 text-ink-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="🔍"
              title="Không có giao dịch nào"
              hint={
                activeFilters || q
                  ? 'Thử bỏ bớt bộ lọc hoặc đổi từ khoá tìm kiếm.'
                  : 'Bấm nút + để ghi khoản chi đầu tiên của tháng này.'
              }
            />
          </div>
        ) : (
          <TransactionGroups rows={filtered} />
        )}
      </div>

      <Sheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Bộ lọc"
        footer={
          <div className="flex gap-3">
            <button
              className="btn-ghost flex-1"
              onClick={() => {
                setTypeFilter('all')
                setCategoryIds([])
                setSharedOnly('all')
              }}
            >
              Xoá lọc
            </button>
            <button className="btn-primary flex-1" onClick={() => setFilterOpen(false)}>
              Xong
            </button>
          </div>
        }
      >
        <p className="label">Loại giao dịch</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {(
            [
              ['all', 'Tất cả'],
              ['expense', 'Chi'],
              ['income', 'Thu'],
              ['transfer', 'Chuyển khoản'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTypeFilter(v)}
              className={clsx(
                'chip',
                typeFilter === v
                  ? 'bg-brand-600 text-white'
                  : 'bg-ink-200/60 text-ink-600 dark:bg-white/5 dark:text-ink-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="label">Khoản chung / riêng</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {(
            [
              ['all', 'Tất cả'],
              ['shared', 'Chỉ khoản chung'],
              ['private', 'Chỉ khoản riêng'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setSharedOnly(v)}
              className={clsx(
                'chip',
                sharedOnly === v
                  ? 'bg-brand-600 text-white'
                  : 'bg-ink-200/60 text-ink-600 dark:bg-white/5 dark:text-ink-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="label">Danh mục</p>
        <div className="flex flex-wrap gap-2">
          {categories
            .filter((c) => !c.archived)
            .map((c) => {
              const on = categoryIds.includes(c.id)
              return (
                <button
                  key={c.id}
                  onClick={() =>
                    setCategoryIds((ids) =>
                      on ? ids.filter((x) => x !== c.id) : [...ids, c.id],
                    )
                  }
                  className={clsx(
                    'chip',
                    on ? 'text-white' : 'bg-ink-200/60 text-ink-600 dark:bg-white/5 dark:text-ink-300',
                  )}
                  style={on ? { background: c.color } : undefined}
                >
                  <span>{c.icon}</span>
                  {c.name}
                </button>
              )
            })}
        </div>
      </Sheet>
    </div>
  )
}
