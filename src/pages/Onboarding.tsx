import { useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useState } from 'react'
import { Segmented, Spinner, useToast } from '@/components/ui'
import { useApp } from '@/hooks/useApp'
import { errorMessage } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import type { MemberRole } from '@/lib/types'

const ROLES: { value: MemberRole; label: string; emoji: string }[] = [
  { value: 'husband', label: 'Chồng', emoji: '👨' },
  { value: 'wife', label: 'Vợ', emoji: '👩' },
  { value: 'other', label: 'Khác', emoji: '🙂' },
]

export default function Onboarding() {
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [householdName, setHouseholdName] = useState('Gia đình mình')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<MemberRole>('husband')
  const [inviteCode, setInviteCode] = useState('')
  const [busy, setBusy] = useState(false)

  const qc = useQueryClient()
  const toast = useToast()
  const { signOut } = useApp()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const { error } =
        mode === 'create'
          ? await supabase.rpc('create_household', {
              p_household_name: householdName,
              p_display_name: displayName,
              p_role: role,
            })
          : await supabase.rpc('join_household', {
              p_invite_code: inviteCode,
              p_display_name: displayName,
              p_role: role,
            })
      if (error) throw error
      await qc.invalidateQueries()
      toast(mode === 'create' ? 'Đã tạo sổ gia đình 🎉' : 'Đã tham gia gia đình 🎉')
    } catch (err) {
      const msg = errorMessage(err, 'Không tạo được sổ gia đình')
      toast(
        /Ma moi khong dung/i.test(msg)
          ? 'Mã mời không đúng'
          : /da thuoc mot gia dinh/i.test(msg)
            ? 'Tài khoản này đã thuộc một gia đình'
            : msg,
        'error',
      )
    } finally {
      setBusy(false)
    }
  }

  const invalid = !displayName.trim() || (mode === 'join' && inviteCode.trim().length < 4)

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center p-6">
      <h1 className="mb-1 text-3xl font-extrabold tracking-tight">Chào bạn 👋</h1>
      <p className="mb-6 text-[15px] text-ink-500">
        Tạo sổ mới cho gia đình, hoặc nhập mã mời của người kia để dùng chung một sổ.
      </p>

      <form onSubmit={submit} className="card p-5">
        <Segmented
          value={mode}
          onChange={setMode}
          className="mb-5"
          options={[
            { value: 'create', label: 'Tạo sổ mới' },
            { value: 'join', label: 'Có mã mời' },
          ]}
        />

        {mode === 'create' ? (
          <>
            <label className="label">Tên gia đình</label>
            <input
              className="field mb-4"
              placeholder="VD: Nhà Toàn & Lan"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
            />
          </>
        ) : (
          <>
            <label className="label">Mã mời</label>
            <input
              className="field mb-4 text-center text-2xl font-extrabold uppercase tracking-[0.3em]"
              placeholder="ABC123"
              maxLength={6}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            />
          </>
        )}

        <label className="label">Tên hiển thị của bạn</label>
        <input
          className="field mb-4"
          placeholder="VD: Toàn"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <label className="label">Bạn là</label>
        <div className="mb-6 flex gap-2">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={clsx(
                'flex flex-1 flex-col items-center gap-1 rounded-2xl py-3 transition active:scale-95',
                role === r.value
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-ink-100 text-ink-600 dark:bg-white/5 dark:text-ink-300',
              )}
            >
              <span className="text-2xl">{r.emoji}</span>
              <span className="text-[13px] font-semibold">{r.label}</span>
            </button>
          ))}
        </div>

        <button type="submit" className="btn-primary w-full" disabled={invalid || busy}>
          {busy && <Spinner />}
          {mode === 'create' ? 'Tạo sổ gia đình' : 'Tham gia'}
        </button>
      </form>

      <button className="mt-6 text-sm font-semibold text-ink-500" onClick={() => void signOut()}>
        Đăng xuất
      </button>
    </div>
  )
}
