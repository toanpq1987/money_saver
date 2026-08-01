import clsx from 'clsx'
import { Check, Copy, Share2 } from 'lucide-react'
import { useState } from 'react'
import { SubHeader } from '@/components/AppShell'
import { Field, Sheet, Spinner, useToast } from '@/components/ui'
import { useApp } from '@/hooks/useApp'
import { useRenameHousehold, useUpdateProfile } from '@/lib/queries'
import type { MemberRole } from '@/lib/types'

const AVATARS = ['👨', '👩', '🧔', '👱‍♀️', '🙂', '😎', '🐱', '🐶', '🌸', '⭐']
const COLORS = ['#2a78d6', '#e87ba4', '#1baf7a', '#eb6834', '#4a3aa7', '#e34948']

const ROLE_LABEL: Record<MemberRole, string> = {
  husband: 'Chồng',
  wife: 'Vợ',
  other: 'Thành viên',
}

export default function Family() {
  const { household, members, profile } = useApp()
  const [copied, setCopied] = useState(false)
  const [editingSelf, setEditingSelf] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const toast = useToast()

  const code = household?.invite_code ?? ''

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Không sao chép được, bạn ghi lại mã giúp nhé', 'error')
    }
  }

  const shareCode = async () => {
    const text = `Vào app MoneySaver và nhập mã mời "${code}" để cùng ghi chi tiêu với mình nhé!`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Mã mời MoneySaver', text })
      } catch {
        /* nguoi dung huy chia se - khong can bao loi */
      }
    } else {
      void copyCode()
    }
  }

  return (
    <div className="page-pad">
      <SubHeader title="Gia đình" subtitle={household?.name} />

      <div className="space-y-4 px-4">
        <section className="card p-5 text-center">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-500">Mã mời</p>
          <p className="mt-2 text-[38px] font-extrabold tracking-[0.25em] text-brand-600 dark:text-brand-400">
            {code}
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
            Người kia tạo tài khoản riêng, rồi chọn <b>“Có mã mời”</b> và nhập mã này để dùng
            chung sổ với bạn.
          </p>
          <div className="mt-4 flex gap-3">
            <button className="btn-ghost flex-1" onClick={copyCode}>
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Đã chép' : 'Chép mã'}
            </button>
            <button className="btn-primary flex-1" onClick={shareCode}>
              <Share2 size={18} /> Chia sẻ
            </button>
          </div>
        </section>

        <section className="card divide-y divide-ink-200/60 overflow-hidden dark:divide-white/5">
          <h2 className="px-4 pb-2 pt-4 text-[13px] font-bold uppercase tracking-wide text-ink-500">
            Thành viên ({members.length})
          </h2>
          {members.map((m) => {
            const isMe = m.id === profile?.id
            return (
              <button
                key={m.id}
                onClick={() => isMe && setEditingSelf(true)}
                className={clsx(
                  'flex w-full items-center gap-3 px-4 py-3.5 text-left',
                  isMe && 'transition active:bg-ink-100 dark:active:bg-white/5',
                )}
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl"
                  style={{ background: `${m.color}22` }}
                >
                  {m.avatar_emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">
                    {m.display_name}
                    {isMe && <span className="ml-1.5 text-[13px] text-ink-500">(bạn)</span>}
                  </span>
                  <span className="block text-[13px] text-ink-500">{ROLE_LABEL[m.role]}</span>
                </span>
                {isMe && (
                  <span className="shrink-0 text-[13px] font-semibold text-brand-600 dark:text-brand-400">
                    Sửa
                  </span>
                )}
              </button>
            )
          })}
        </section>

        <button className="btn-ghost w-full" onClick={() => setRenaming(true)}>
          Đổi tên gia đình
        </button>

        <p className="px-2 text-[13px] leading-relaxed text-ink-500">
          Mọi thành viên đều thấy và sửa được toàn bộ giao dịch của sổ chung. Tab riêng của mỗi
          người chỉ là bộ lọc theo người chi, không phải sổ tách biệt.
        </p>
      </div>

      <SelfSheet open={editingSelf} onClose={() => setEditingSelf(false)} />
      <RenameSheet open={renaming} onClose={() => setRenaming(false)} />
    </div>
  )
}

function SelfSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useApp()
  const update = useUpdateProfile()
  const toast = useToast()

  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🙂')
  const [color, setColor] = useState(COLORS[0])
  const [role, setRole] = useState<MemberRole>('other')

  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open && profile) {
      setName(profile.display_name)
      setEmoji(profile.avatar_emoji)
      setColor(profile.color)
      setRole(profile.role)
    }
  }

  const submit = async () => {
    if (!profile || !name.trim()) return
    try {
      await update.mutateAsync({
        id: profile.id,
        display_name: name.trim(),
        avatar_emoji: emoji,
        color,
        role,
      })
      toast('Đã cập nhật hồ sơ')
      onClose()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Lưu thất bại', 'error')
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Hồ sơ của bạn"
      footer={
        <button className="btn-primary w-full" disabled={!name.trim() || update.isPending} onClick={submit}>
          {update.isPending && <Spinner />}
          Lưu
        </button>
      }
    >
      <Field label="Tên hiển thị">
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <Field label="Vai trò">
        <select
          className="field"
          value={role}
          onChange={(e) => setRole(e.target.value as MemberRole)}
        >
          {(Object.keys(ROLE_LABEL) as MemberRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Ảnh đại diện">
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setEmoji(a)}
              className={clsx(
                'grid h-11 w-11 place-items-center rounded-2xl text-xl transition active:scale-90',
                emoji === a ? 'bg-brand-600 shadow-md' : 'bg-ink-100 dark:bg-white/5',
              )}
            >
              {a}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Màu đại diện" hint="Dùng trong biểu đồ so sánh chi tiêu">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Chọn màu ${c}`}
              className={clsx(
                'h-11 w-11 rounded-2xl transition active:scale-90',
                color === c &&
                  'ring-2 ring-ink-950 ring-offset-2 ring-offset-ink-50 dark:ring-white dark:ring-offset-ink-950',
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </Field>
    </Sheet>
  )
}

function RenameSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { household } = useApp()
  const rename = useRenameHousehold()
  const toast = useToast()
  const [name, setName] = useState('')

  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setName(household?.name ?? '')
  }

  const submit = async () => {
    if (!household || !name.trim()) return
    await rename.mutateAsync({ id: household.id, name: name.trim() })
    toast('Đã đổi tên gia đình')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Đổi tên gia đình"
      footer={
        <button className="btn-primary w-full" disabled={!name.trim() || rename.isPending} onClick={submit}>
          {rename.isPending && <Spinner />}
          Lưu
        </button>
      }
    >
      <Field label="Tên gia đình">
        <input
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Nhà Toàn & Lan"
        />
      </Field>
    </Sheet>
  )
}
