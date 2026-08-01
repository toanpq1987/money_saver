import clsx from 'clsx'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { SubHeader } from '@/components/AppShell'
import {
  EmptyState,
  Field,
  MoneyInput,
  Sheet,
  Spinner,
  useConfirm,
  useToast,
} from '@/components/ui'
import { useApp } from '@/hooks/useApp'
import { formatMoney } from '@/lib/format'
import { useDeleteAccount, useSaveAccount } from '@/lib/queries'
import type { Account, AccountKind } from '@/lib/types'

const KINDS: { value: AccountKind; label: string; icon: string }[] = [
  { value: 'cash', label: 'Tiền mặt', icon: '💵' },
  { value: 'bank', label: 'Ngân hàng', icon: '🏦' },
  { value: 'ewallet', label: 'Ví điện tử', icon: '📱' },
  { value: 'credit', label: 'Thẻ tín dụng', icon: '💳' },
]

export default function Accounts() {
  const { accounts, balanceOf, memberById } = useApp()
  const [editing, setEditing] = useState<Account | null>(null)
  const [creating, setCreating] = useState(false)

  const live = accounts.filter((a) => !a.archived)
  const archived = accounts.filter((a) => a.archived)
  const total = live.reduce((s, a) => s + balanceOf(a.id), 0)

  return (
    <div className="page-pad">
      <SubHeader title="Ví & tài khoản" subtitle={`Tổng: ${formatMoney(total)}`} />

      <div className="space-y-4 px-4">
        {live.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="👛"
              title="Chưa có ví nào"
              hint="Tạo ví tiền mặt, tài khoản ngân hàng hoặc ví điện tử để theo dõi số dư."
            />
          </div>
        ) : (
          <section className="card divide-y divide-ink-200/60 overflow-hidden dark:divide-white/5">
            {live.map((a) => {
              const balance = balanceOf(a.id)
              const owner = memberById(a.owner_id)
              return (
                <button
                  key={a.id}
                  onClick={() => setEditing(a)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-ink-100 dark:active:bg-white/5"
                >
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl"
                    style={{ background: `${a.color}22` }}
                  >
                    {a.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{a.name}</span>
                    <span className="block truncate text-[13px] text-ink-500">
                      {KINDS.find((k) => k.value === a.kind)?.label}
                      {owner ? ` · riêng của ${owner.display_name}` : ' · chung'}
                    </span>
                  </span>
                  <span
                    className={clsx(
                      'shrink-0 font-bold tabular-nums',
                      balance < 0 && 'text-red-500',
                    )}
                  >
                    {formatMoney(balance)}
                  </span>
                </button>
              )
            })}
          </section>
        )}

        <button className="btn-ghost w-full" onClick={() => setCreating(true)}>
          <Plus size={18} /> Thêm ví mới
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

function AccountSheet({
  open,
  account,
  onClose,
}: {
  open: boolean
  account: Account | null
  onClose: () => void
}) {
  const { household, members, balanceOf } = useApp()
  const save = useSaveAccount()
  const del = useDeleteAccount()
  const toast = useToast()
  const confirm = useConfirm()

  const [name, setName] = useState('')
  const [kind, setKind] = useState<AccountKind>('cash')
  const [opening, setOpening] = useState(0)
  const [ownerId, setOwnerId] = useState('')
  const [archived, setArchived] = useState(false)

  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setName(account?.name ?? '')
      setKind(account?.kind ?? 'cash')
      setOpening(account?.opening_balance ?? 0)
      setOwnerId(account?.owner_id ?? '')
      setArchived(account?.archived ?? false)
    }
  }

  const submit = async () => {
    if (!household || !name.trim()) return
    try {
      await save.mutateAsync({
        id: account?.id,
        household_id: household.id,
        name: name.trim(),
        kind,
        icon: KINDS.find((k) => k.value === kind)?.icon ?? '👛',
        color: kind === 'cash' ? '#008300' : kind === 'credit' ? '#e34948' : '#2a78d6',
        opening_balance: opening,
        owner_id: ownerId || null,
        archived,
      })
      toast(account ? 'Đã cập nhật ví' : 'Đã tạo ví mới')
      onClose()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Lưu thất bại', 'error')
    }
  }

  const remove = async () => {
    if (!account) return
    const ok = await confirm({
      title: `Xoá ví “${account.name}”?`,
      message:
        'Các giao dịch đã ghi vẫn được giữ lại nhưng sẽ không còn gắn với ví nào. Nếu chỉ muốn ngừng dùng, hãy chọn “Ẩn ví” thay vì xoá.',
      confirmLabel: 'Xoá ví',
      danger: true,
    })
    if (!ok) return
    await del.mutateAsync(account.id)
    toast('Đã xoá ví')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={account ? 'Sửa ví' : 'Ví mới'}
      footer={
        <div className="flex gap-3">
          {account && (
            <button className="btn btn-danger px-4" onClick={remove} aria-label="Xoá">
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn-primary flex-1" disabled={!name.trim() || save.isPending} onClick={submit}>
            {save.isPending && <Spinner />}
            Lưu
          </button>
        </div>
      }
    >
      <Field label="Tên ví">
        <input
          className="field"
          placeholder="VD: Vietcombank của chồng"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Loại ví">
        <div className="grid grid-cols-4 gap-2">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={clsx(
                'flex flex-col items-center gap-1 rounded-2xl py-3 transition active:scale-95',
                kind === k.value
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-ink-100 text-ink-600 dark:bg-white/5 dark:text-ink-300',
              )}
            >
              <span className="text-xl">{k.icon}</span>
              <span className="text-[11px] font-semibold">{k.label}</span>
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="Số dư ban đầu"
        hint={
          account
            ? `Số dư hiện tại: ${formatMoney(balanceOf(account.id))} (đã tính các giao dịch)`
            : 'Số tiền đang có trong ví này trước khi bắt đầu ghi chép'
        }
      >
        <MoneyInput value={opening} onChange={setOpening} />
      </Field>

      {members.length > 1 && (
        <Field label="Thuộc về">
          <select className="field" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">Ví chung của gia đình</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                Ví riêng của {m.avatar_emoji} {m.display_name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {account && (
        <label className="flex items-center gap-3 rounded-2xl bg-ink-100 px-4 py-3 dark:bg-white/5">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
            className="h-5 w-5 rounded accent-brand-600"
          />
          <span className="text-[15px] font-semibold">Ẩn ví này (không dùng nữa)</span>
        </label>
      )}
    </Sheet>
  )
}
