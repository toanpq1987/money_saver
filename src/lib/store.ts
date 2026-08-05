import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { monthKey } from './format'
import type { MemberFilter, StatementMode } from './types'

type Theme = 'light' | 'dark' | 'system'

interface UIState {
  /** Thang dang xem, dang 'YYYY-MM-01' */
  month: string
  setMonth: (m: string) => void

  /** 'all' | profile.id  - dung cho tab rieng cua vo & chong */
  member: MemberFilter
  setMember: (m: MemberFilter) => void

  /**
   * Cach chia ky o man hinh Sao ke, va ngay chot cua the tin dung.
   *
   * Hai gia tri nay ngoai le duoc GIU LAI giua cac phien, khac voi cac bo loc
   * khac (xem CLAUDE.md). Ly do: chu ky sao ke la mot dac diem co dinh cua
   * ngan hang chu khong phai mot lan loc nhat thoi - bat nguoi dung go lai
   * "ngay 24" moi thang la vo ly. An toan vi khong man hinh nao khac doc hai
   * gia tri nay, va man Sao ke luon in ro khoang ngay dang xem len dau trang.
   */
  statementMode: StatementMode
  setStatementMode: (m: StatementMode) => void
  statementCycleDay: number
  setStatementCycleDay: (d: number) => void

  theme: Theme
  setTheme: (t: Theme) => void
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      month: monthKey(new Date()),
      setMonth: (month) => set({ month }),
      member: 'all',
      setMember: (member) => set({ member }),
      statementMode: 'month',
      setStatementMode: (statementMode) => set({ statementMode }),
      statementCycleDay: 24,
      setStatementCycleDay: (statementCycleDay) => set({ statementCycleDay }),
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'moneysaver.ui',
      // Thang dang xem khong nen dinh giua cac phien - luon mo o thang hien tai.
      partialize: (s) =>
        ({
          member: s.member,
          theme: s.theme,
          statementMode: s.statementMode,
          statementCycleDay: s.statementCycleDay,
        }) as Partial<UIState>,
    },
  ),
)

/** Ap dung theme len <html> va cap nhat mau thanh trang thai iOS. */
export function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.classList.toggle('light', !dark)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#0f172a' : '#f6f7f9')
}
