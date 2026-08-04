import clsx from 'clsx'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SubHeader } from '@/components/AppShell'
import { ACCOUNT_KINDS, AccountSheet } from '@/components/AccountSheet'
import { EmptyState } from '@/components/ui'
import { useApp } from '@/hooks/useApp'
import { formatMoney } from '@/lib/format'
import { groupAccountsByOwner } from '@/lib/wallets'
import type { Account } from '@/lib/types'

export default function Accounts() {
  const { accounts, balanceOf, members, profile } = useApp()
  const [editing, setEditing] = useState<Account | null>(null)
  const [creating, setCreating] = useState(false)

  const live = accounts.filter((a) => !a.archived)
  const archived = accounts.filter((a) => a.archived)
  const total = live.reduce((s, a) => s + balanceOf(a.id), 0)

  const groups = useMemo(
    () => groupAccountsByOwner(accounts, members, profile?.id),
    [accounts, members, profile?.id],
  )

  return (
    <div className="page-pad">
      <SubHeader title="Ví & tài khoản" subtitle={`Tổng: ${formatMoney(total)}`} />

      <div className="space-y-4 px-4">
        {live.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="👛"
              title="Chưa có tài khoản nào"
              hint="Tạo tài khoản tiền mặt, ngân hàng hoặc ví điện tử. Chúng sẽ được gom vào ví của từng người hoặc ví chung của nhà."
            />
          </div>
        ) : (
          /* Moi vi la mot the rieng, ben trong la cac tai khoan cua vi do */
          groups.map((g) => {
            const groupBalance = g.accountIds.reduce((s, id) => s + balanceOf(id), 0)
            return (
              <section key={g.key} className="card overflow-hidden">
                <header className="flex items-baseline justify-between gap-3 px-4 pt-4">
                  <h2 className="flex items-center gap-2 font-bold">
                    <span>{g.emoji}</span>
                    {g.name}
                  </h2>
                  <span
                    className={clsx(
                      'shrink-0 font-bold tabular-nums',
                      groupBalance < 0 && 'text-red-500',
                    )}
                  >
                    {formatMoney(groupBalance)}
                  </span>
                </header>

                <div className="mt-2 divide-y divide-ink-200/60 dark:divide-white/5">
                  {g.accounts.map((a) => {
                    const balance = balanceOf(a.id)
                    return (
                      <button
                        key={a.id}
                        onClick={() => setEditing(a)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-ink-100 dark:active:bg-white/5"
                      >
                        <span
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-lg"
                          style={{ background: `${a.color}22` }}
                        >
                          {a.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold">{a.name}</span>
                          <span className="block truncate text-[13px] text-ink-500">
                            {ACCOUNT_KINDS.find((k) => k.value === a.kind)?.label}
                          </span>
                        </span>
                        <span
                          className={clsx(
                            'shrink-0 font-semibold tabular-nums',
                            balance < 0 && 'text-red-500',
                          )}
                        >
                          {formatMoney(balance)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })
        )}

        <button className="btn-ghost w-full" onClick={() => setCreating(true)}>
          <Plus size={18} /> Thêm tài khoản
        </button>

        {archived.length > 0 && (
          <section>
            <h2 className="mb-2 px-1 text-[13px] font-bold uppercase tracking-wide text-ink-500">
              Đã ẩn
            </h2>
            <div className="card divide-y divide-ink-200/60 overflow-hidden opacity-60 dark:divide-white/5">
              {archived.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setEditing(a)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="text-lg">{a.icon}</span>
                  <span className="flex-1 truncate text-[15px] font-semibold">{a.name}</span>
                  <span className="text-[13px] tabular-nums">{formatMoney(balanceOf(a.id))}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <AccountSheet
        open={creating || Boolean(editing)}
        account={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
