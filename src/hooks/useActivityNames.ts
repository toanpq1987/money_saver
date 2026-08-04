import { useMemo } from 'react'
import { useApp } from './useApp'
import type { ActivityNames } from '@/lib/activity'

/**
 * Doi uuid trong nhat ky thanh ten doc duoc.
 *
 * Nhat ky luu id chu khong luu ten, de sau nay doi ten danh muc thi cac dong
 * cu cung hien theo ten moi. Doi lai, luc hien phai tra nguoc ra ten - va
 * phai chiu duoc truong hop ban ghi goc da bi xoa han.
 */
export function useActivityNames(): ActivityNames {
  const { categories, accounts, members } = useApp()

  return useMemo(
    () => ({
      category: (id) => categories.find((c) => c.id === id)?.name ?? 'Đã xoá',
      account: (id) => accounts.find((a) => a.id === id)?.name ?? 'Đã xoá',
      member: (id) => members.find((m) => m.id === id)?.display_name ?? 'Đã xoá',
    }),
    [categories, accounts, members],
  )
}
