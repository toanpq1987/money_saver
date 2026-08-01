import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { clearOutbox } from '@/lib/outbox'
import { supabase } from '@/lib/supabase'
import {
  useAccounts,
  useBalances,
  useCategories,
  useHousehold,
  useMembers,
  useMyProfile,
  useRealtimeSync,
} from '@/lib/queries'
import { useUI } from '@/lib/store'
import type { Account, Category, Household, Profile } from '@/lib/types'

interface AppValue {
  session: Session | null
  authLoading: boolean
  profile: Profile | null
  household: Household | null
  members: Profile[]
  categories: Category[]
  accounts: Account[]
  balanceOf: (accountId: string) => number
  memberById: (id: string | null | undefined) => Profile | undefined
  categoryById: (id: string | null | undefined) => Category | undefined
  accountById: (id: string | null | undefined) => Account | undefined
  /** Dang tai nhung du lieu nen ma moi man hinh deu can. */
  bootstrapping: boolean
  signOut: () => Promise<void>
}

const AppContext = createContext<AppValue | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp phải được dùng bên trong <AppProvider>')
  return ctx
}

/** Tien ich: lay profile chac chan da co (dung trong khu vuc da dang nhap). */
export function useMe(): Profile {
  const { profile } = useApp()
  if (!profile) throw new Error('Chưa có hồ sơ người dùng')
  return profile
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const qc = useQueryClient()

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setAuthLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      setAuthLoading(false)
      if (event === 'SIGNED_OUT') {
        // Khong de du lieu gia dinh nay con nam lai tren may cho nguoi dang
        // nhap sau. Hang doi cung bo luon vi khong con quyen ghi.
        clearOutbox()
        qc.clear()
        try {
          localStorage.removeItem('moneysaver.cache.v1')
        } catch {
          /* localStorage co the bi chan - bo qua */
        }
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [qc])

  const userId = session?.user.id
  const profileQ = useMyProfile(userId)
  const profile = profileQ.data ?? null
  const hasProfile = Boolean(profile)

  const householdQ = useHousehold(hasProfile)
  const membersQ = useMembers(hasProfile)
  const categoriesQ = useCategories(hasProfile)
  const accountsQ = useAccounts(hasProfile)
  const balancesQ = useBalances(hasProfile)

  useRealtimeSync(profile?.household_id)

  // Bo loc thanh vien duoc luu lai giua cac phien. Neu nguoi do khong con
  // trong gia dinh nua thi tra ve "Ca nha", tranh man hinh trong tron.
  const memberList = membersQ.data
  useEffect(() => {
    if (!memberList?.length) return
    const { member, setMember } = useUI.getState()
    if (member !== 'all' && !memberList.some((m) => m.id === member)) setMember('all')
  }, [memberList])

  const value = useMemo<AppValue>(() => {
    const members = membersQ.data ?? []
    const categories = categoriesQ.data ?? []
    const accounts = accountsQ.data ?? []
    const balances = balancesQ.data ?? []

    const balanceMap = new Map(balances.map((b) => [b.account_id, b.balance]))
    const memberMap = new Map(members.map((m) => [m.id, m]))
    const categoryMap = new Map(categories.map((c) => [c.id, c]))
    const accountMap = new Map(accounts.map((a) => [a.id, a]))

    return {
      session,
      authLoading,
      profile,
      household: householdQ.data ?? null,
      members,
      categories,
      accounts,
      balanceOf: (id) => balanceMap.get(id) ?? 0,
      memberById: (id) => (id ? memberMap.get(id) : undefined),
      categoryById: (id) => (id ? categoryMap.get(id) : undefined),
      accountById: (id) => (id ? accountMap.get(id) : undefined),
      bootstrapping:
        authLoading ||
        (Boolean(userId) && profileQ.isLoading) ||
        (hasProfile && (categoriesQ.isLoading || accountsQ.isLoading || membersQ.isLoading)),
      signOut: async () => {
        await supabase.auth.signOut()
      },
    }
  }, [
    session,
    authLoading,
    userId,
    profile,
    hasProfile,
    profileQ.isLoading,
    householdQ.data,
    membersQ.data,
    membersQ.isLoading,
    categoriesQ.data,
    categoriesQ.isLoading,
    accountsQ.data,
    accountsQ.isLoading,
    balancesQ.data,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
