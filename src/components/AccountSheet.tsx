import clsx from 'clsx'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '@/hooks/useApp'
import { errorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useDeleteAccount, useSaveAccount } from '@/lib/queries'
import type { Account, AccountKind } from '@/lib/types'
import { Field, MoneyInput, Sheet, Spinner, useConfirm, useToast } from './ui'

export const ACCOUNT_KINDS: { value: AccountKind; label: string; icon: string }[] = [
  { value: 'cash', label: 'Tiền mặt', icon: '💵' },
  { value: 'bank', label: 'Ngân hàng', icon: '🏦' },
  { value: 'ewallet', label: 'Ví điện tử', icon: '📱' },
  { value: 'credit', label: 'Thẻ tín dụng', icon: '💳' },
]

/**
 * Man hinh them/sua vi. Dung o hai noi:
 *  - Trang "Ví & tài khoản" (sua, an, xoa)
 *  - Ngay trong form them giao dich, khi can tao vi moi giua chung
 *    (luc do truyen onCreated de chon luon vi vua tao).
 */
export function AccountSheet({
  open,
  account,
  onClose,
  onCreated,
}: {
  open: boolean
  account: Account | null
  onClose: () => void
  /** Goi sau khi tao MOI thanh cong, kem id cua vi vua tao. */
  onCreated?: (id: string) => void
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
      const { id } = await save.mutateAsync({
        id: account?.id,
        household_id: household.id,
        name: name.trim(),
        kind,
        icon: ACCOUNT_KINDS.find((k) => k.value === kind)?.icon ?? '👛',
        color: kind === 'cash' ? '#008300' : kind === 'credit' ? '#e34948' : '#2a78d6',
        opening_balance: opening,
        owner_id: ownerId || null,
        archived,
      })
      toast(account ? 'Đã cập nhật ví' : 'Đã tạo ví mới')
      if (!account) onCreated?.(id)
      onClose()
    } catch (e) {
      toast(errorMessage(e, 'Lưu thất bại'), 'error')
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
          <button
            className="btn-primary flex-1"
            disabled={!name.trim() || save.isPending}
            onClick={submit}
          >
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
          autoFocus={!account}
        />
      </Field>

      <Field label="Loại ví">
        <div className="grid grid-cols-4 gap-2">
          {ACCOUNT_KINDS.map((k) => (
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
