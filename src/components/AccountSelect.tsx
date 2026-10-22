import { useMemo } from 'react'
import { useApp } from '@/hooks/useApp'
import { formatMoney } from '@/lib/format'
import { groupAccountsByOwner } from '@/lib/wallets'

/**
 * O chon tai khoan, gom theo vi (Ví của tôi / Ví của vợ / Ví chung) va kem so
 * du hien tai - luc chia tien thi can biet tai khoan nao dang con bao nhieu.
 */
export function AccountSelect({
  value,
  onChange,
  exclude = [],
  placeholder = '— Chọn tài khoản —',
}: {
  value: string | null
  onChange: (id: string | null) => void
  /** Tai khoan khong duoc chon o day, vd chinh tai khoan nguon. */
  exclude?: (string | null)[]
  placeholder?: string
}) {
  const { accounts, members, profile, balanceOf } = useApp()
  const groups = useMemo(
    () => groupAccountsByOwner(accounts, members, profile?.id),
    [accounts, members, profile?.id],
  )

  return (
    <select
      className="field"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">{placeholder}</option>
      {groups.map((g) => {
        const options = g.accounts.filter((a) => !exclude.includes(a.id))
        if (options.length === 0) return null
        return (
          <optgroup key={g.key} label={`${g.emoji} ${g.name}`}>
            {options.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon} {a.name} · {formatMoney(balanceOf(a.id))}
              </option>
            ))}
          </optgroup>
        )
      })}
    </select>
  )
}
