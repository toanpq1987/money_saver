import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  applyBalanceLocally,
  applyListLocally,
  applyTransactionLocally,
  findCachedTransaction,
} from './optimistic'
import { ConflictError, isConflict } from './errors'
import { newId, sendOrQueue } from './outbox'
import { changedFields } from './patch'
import { supabase } from './supabase'
import type {
  Account,
  AccountBalance,
  ActivityLog,
  Budget,
  Category,
  Debt,
  Deposit,
  Household,
  Profile,
  RecurringBill,
  SavingsEntry,
  SavingsGoal,
  Transaction,
} from './types'

/** PostgREST tra numeric duoi dang so, nhung ep kieu lai cho chac. */
const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v))

export const qk = {
  household: ['household'] as const,
  profile: ['profile'] as const,
  members: ['members'] as const,
  categories: ['categories'] as const,
  accounts: ['accounts'] as const,
  balances: ['balances'] as const,
  transactions: (from: string, to: string) => ['transactions', from, to] as const,
  budgets: (month: string) => ['budgets', month] as const,
  goals: ['goals'] as const,
  savingsEntries: ['savings_entries'] as const,
  deposits: ['deposits'] as const,
  debts: ['debts'] as const,
  bills: ['bills'] as const,
  activity: ['activity'] as const,
}

// ---------------------------------------------------------------------------
// Nguoi dung & gia dinh
// ---------------------------------------------------------------------------

export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: qk.profile,
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .maybeSingle()
      if (error) throw error
      return (data as Profile) ?? null
    },
  })
}

export function useHousehold(enabled: boolean) {
  return useQuery({
    queryKey: qk.household,
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('households').select('*').limit(1).maybeSingle()
      if (error) throw error
      return (data as Household) ?? null
    },
  })
}

export function useMembers(enabled: boolean) {
  return useQuery({
    queryKey: qk.members,
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<Profile> & { id: string }) => {
      const { id, ...rest } = patch
      const values = rest as Record<string, unknown>
      const pending = await sendOrQueue({
        table: 'profiles',
        action: 'update',
        values,
        match: { id },
      })
      qc.setQueryData(qk.profile, (old: Profile | null | undefined) =>
        old && old.id === id ? { ...old, ...values } : old,
      )
      applyListLocally(qc, qk.members, { ...values, id }, 'update', false)
      return { pending }
    },
    onSuccess: ({ pending }) => {
      if (pending) return
      qc.invalidateQueries({ queryKey: qk.profile })
      qc.invalidateQueries({ queryKey: qk.members })
    },
  })
}

export function useRenameHousehold() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const pending = await sendOrQueue({
        table: 'households',
        action: 'update',
        values: { name },
        match: { id },
      })
      qc.setQueryData(qk.household, (old: Household | null | undefined) =>
        old ? { ...old, name } : old,
      )
      return { pending }
    },
    onSuccess: ({ pending }) => {
      if (!pending) qc.invalidateQueries({ queryKey: qk.household })
    },
  })
}

// ---------------------------------------------------------------------------
// Danh muc & vi
// ---------------------------------------------------------------------------

export function useCategories(enabled: boolean) {
  return useQuery({
    queryKey: qk.categories,
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return (data ?? []) as Category[]
    },
  })
}

export function useAccounts(enabled: boolean) {
  return useQuery({
    queryKey: qk.accounts,
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return ((data ?? []) as Account[]).map((a) => ({
        ...a,
        opening_balance: num(a.opening_balance),
      }))
    },
  })
}

export function useBalances(enabled: boolean) {
  return useQuery({
    queryKey: qk.balances,
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('v_account_balances').select('*')
      if (error) throw error
      return ((data ?? []) as AccountBalance[]).map((b) => ({ ...b, balance: num(b.balance) }))
    },
  })
}

// ---------------------------------------------------------------------------
// Giao dich
// ---------------------------------------------------------------------------

export function useTransactions(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: qk.transactions(from, to),
    enabled,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('occurred_at', from)
        .lte('occurred_at', to)
        .order('occurred_at', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return ((data ?? []) as Transaction[]).map((t) => ({ ...t, amount: num(t.amount) }))
    },
  })
}

export type NewTransaction = Omit<
  Transaction,
  'id' | 'household_id' | 'created_at' | 'updated_at' | 'created_by'
>

export interface SaveTransactionInput extends NewTransaction {
  id?: string
  household_id: string
  created_by: string
  /**
   * Ban ghi doc duoc luc MO form. Dung de biet nguoi dung that su doi nhung o
   * nao, va de chan ghi de neu may chu da khac di. Bo trong = them moi.
   */
  baseline?: Transaction | null
  /** Nguoi dung da xem canh bao xung dot va chon ghi de. */
  force?: boolean
}

export function useSaveTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveTransactionInput) => {
      const isNew = !input.id
      // Sinh id ngay tai may de ban ghi tao khi offline van co danh tinh on dinh.
      const id = input.id ?? newId()
      const { id: _ignored, baseline = null, force = false, ...rest } = input
      const values = rest as Record<string, unknown>
      const now = new Date().toISOString()

      if (isNew) {
        const row = { ...values, id, created_at: now, updated_at: now } as Transaction
        const pending = await sendOrQueue({
          table: 'transactions',
          action: 'insert',
          values: { ...values, id },
        })
        applyTransactionLocally(qc, row, 'insert', pending)
        applyBalanceLocally(qc, row, null)
        return { id, pending, unchanged: false }
      }

      // created_by khong duoc phep doi khi sua
      const patch = changedFields(
        baseline as Record<string, unknown> | null,
        stripKeys(values, ['created_by']),
      )
      if (Object.keys(patch).length === 0) return { id, pending: false, unchanged: true }

      const pending = await sendGuarded({
        table: 'transactions',
        action: 'update',
        values: patch,
        match: { id },
        // Chi ghi de khi cac o minh sap ghi VAN dang giu gia tri luc minh doc.
        // Bo qua khi nguoi dung da xem canh bao va chon "Vẫn lưu đè".
        guard: force ? undefined : guardFrom(baseline, patch),
      })

      // Gop patch len ban MOI NHAT dang co, khong phai len baseline: nho vay o
      // nguoi kia vua sua van giu nguyen thay vi bi keo nguoc ve gia tri cu.
      const previous = findCachedTransaction(qc, id) ?? baseline ?? null
      const row = { ...(previous ?? {}), ...patch, id, updated_at: now } as Transaction

      applyTransactionLocally(qc, row, 'update', pending)
      applyBalanceLocally(qc, row, previous)
      return { id, pending, unchanged: false }
    },
    onSuccess: ({ pending, unchanged }) => {
      if (!pending && !unchanged) invalidateMoney(qc)
    },
  })
}

/**
 * Dieu kien "cac o toi sap ghi van dang nhu luc toi doc", lay tu chinh ban
 * ghi goc. Chi lay dung nhung o nam trong patch: cac o khac nguoi kia co doi
 * cung khong lien quan gi den minh.
 */
function guardFrom(
  baseline: Transaction | null,
  patch: Record<string, unknown>,
): Record<string, string | number | boolean | null> | undefined {
  if (!baseline) return undefined

  const guard: Record<string, string | number | boolean | null> = {}
  for (const key of Object.keys(patch)) {
    const value = (baseline as unknown as Record<string, unknown>)[key]
    if (value === undefined) continue
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      guard[key] = value
    }
  }
  return Object.keys(guard).length > 0 ? guard : undefined
}

/**
 * Gui lenh sua co kem guard, va khi bi tu choi thi tra loi cho duoc cau hoi
 * "nguoi kia sua hay xoa mat roi?" - hai truong hop nay can hai cach xu ly
 * khac han nhau o giao dien.
 */
async function sendGuarded(op: Parameters<typeof sendOrQueue>[0]): Promise<boolean> {
  try {
    return await sendOrQueue(op)
  } catch (e) {
    if (!isConflict(e) || !op.match?.id) throw e
    throw await describeConflict(op.table, op.match.id)
  }
}

async function describeConflict(table: string, id: string): Promise<ConflictError> {
  try {
    const { data } = await supabase.from(table).select('*').eq('id', id).maybeSingle()
    if (!data) return new ConflictError({ deleted: true })
    const row = data as Record<string, unknown>
    return new ConflictError({
      current: 'amount' in row ? { ...row, amount: num(row.amount) } : row,
    })
  } catch {
    // Khong hoi duoc may chu thi van bao xung dot, chi la khong biet ro vi sao.
    return new ConflictError()
  }
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const previous = findCachedTransaction(qc, id) ?? null
      const pending = await sendOrQueue({
        table: 'transactions',
        action: 'delete',
        match: { id },
      })

      if (previous) {
        applyTransactionLocally(qc, previous, 'delete', false)
        applyBalanceLocally(qc, null, previous)
      }
      return { pending }
    },
    onSuccess: ({ pending }) => {
      if (!pending) invalidateMoney(qc)
    },
  })
}

function invalidateMoney(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['transactions'] })
  qc.invalidateQueries({ queryKey: qk.balances })
}

function stripKeys<T extends Record<string, unknown>>(obj: T, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = { ...obj }
  for (const k of keys) delete out[k]
  return out
}

// ---------------------------------------------------------------------------
// CRUD chung cho cac bang con lai
// ---------------------------------------------------------------------------

function useList<T>(table: string, key: readonly unknown[], enabled: boolean, order?: string) {
  return useQuery({
    queryKey: key,
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase.from(table).select('*')
      if (order) q = q.order(order, { ascending: false })
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as T[]
    },
  })
}

/**
 * Them/sua mot ban ghi. Khoa dau tien trong `keys` phai la khoa cua danh
 * sach chua ban ghi do - no se duoc cap nhat ngay tai may khi dang offline.
 */
function useUpsert<T extends { id?: string }>(table: string, keys: readonly unknown[][]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: T) => {
      const isNew = !input.id
      const id = input.id ?? newId()
      const { id: _ignored, ...rest } = input
      // Khong sinh kieu tu database nen o day dung ban ghi tong quat.
      const values = rest as Record<string, unknown>

      const pending = await sendOrQueue(
        isNew
          ? { table, action: 'insert', values: { ...values, id } }
          : { table, action: 'update', values, match: { id } },
      )

      applyListLocally(qc, keys[0], { ...values, id }, isNew ? 'insert' : 'update', pending)
      return { id, pending }
    },
    onSuccess: ({ pending }) => {
      if (!pending) keys.forEach((k) => qc.invalidateQueries({ queryKey: k }))
    },
  })
}

function useRemove(table: string, keys: readonly unknown[][]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const pending = await sendOrQueue({ table, action: 'delete', match: { id } })
      applyListLocally(qc, keys[0], { id }, 'delete', false)
      return { pending }
    },
    onSuccess: ({ pending }) => {
      if (!pending) keys.forEach((k) => qc.invalidateQueries({ queryKey: k }))
    },
  })
}

// --- Danh muc ---
export const useSaveCategory = () => useUpsert<Partial<Category>>('categories', [[...qk.categories]])
export const useDeleteCategory = () => useRemove('categories', [[...qk.categories], ['transactions']])

// --- Vi ---
export const useSaveAccount = () =>
  useUpsert<Partial<Account>>('accounts', [[...qk.accounts], [...qk.balances]])
export const useDeleteAccount = () =>
  useRemove('accounts', [[...qk.accounts], [...qk.balances], ['transactions']])

// --- Ngan sach ---
export function useBudgets(month: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.budgets(month),
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('budgets').select('*').eq('month', month)
      if (error) throw error
      return ((data ?? []) as Budget[]).map((b) => ({ ...b, amount: num(b.amount) }))
    },
  })
}

export function useSaveBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      household_id: string
      category_id: string
      month: string
      amount: number
    }) => {
      const key = qk.budgets(input.month)

      if (input.amount <= 0) {
        const pending = await sendOrQueue({
          table: 'budgets',
          action: 'delete',
          match: { category_id: input.category_id, month: input.month },
        })
        qc.setQueryData(key, (old: Budget[] | undefined) =>
          old?.filter((b) => b.category_id !== input.category_id),
        )
        return { pending }
      }

      const pending = await sendOrQueue({
        table: 'budgets',
        action: 'upsert',
        values: input,
        onConflict: 'household_id,category_id,month',
      })
      qc.setQueryData(key, (old: Budget[] | undefined) => {
        if (!old) return old
        const index = old.findIndex((b) => b.category_id === input.category_id)
        if (index === -1) return [...old, { ...input, id: newId(), created_at: '' } as Budget]
        const next = [...old]
        next[index] = { ...next[index], amount: input.amount }
        return next
      })
      return { pending }
    },
    onSuccess: ({ pending }) => {
      if (!pending) qc.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

// --- Quy tiet kiem ---
export const useGoals = (enabled: boolean) =>
  useList<SavingsGoal>('savings_goals', qk.goals, enabled, 'created_at')
export const useSaveGoal = () => useUpsert<Partial<SavingsGoal>>('savings_goals', [[...qk.goals]])
export const useDeleteGoal = () =>
  useRemove('savings_goals', [[...qk.goals], [...qk.savingsEntries]])

export function useSavingsEntries(enabled: boolean) {
  return useQuery({
    queryKey: qk.savingsEntries,
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_entries')
        .select('*')
        .order('occurred_at', { ascending: false })
      if (error) throw error
      return ((data ?? []) as SavingsEntry[]).map((e) => ({ ...e, amount: num(e.amount) }))
    },
  })
}
export const useSaveSavingsEntry = () =>
  useUpsert<Partial<SavingsEntry>>('savings_entries', [[...qk.savingsEntries], [...qk.goals]])
export const useDeleteSavingsEntry = () =>
  useRemove('savings_entries', [[...qk.savingsEntries], [...qk.goals]])

// --- So tiet kiem ngan hang ---
export function useDeposits(enabled: boolean) {
  return useQuery({
    queryKey: qk.deposits,
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .order('opened_at', { ascending: false })
      if (error) throw error
      return ((data ?? []) as Deposit[]).map((d) => ({
        ...d,
        principal: num(d.principal),
        interest_rate: num(d.interest_rate),
      }))
    },
  })
}
export const useSaveDeposit = () => useUpsert<Partial<Deposit>>('deposits', [[...qk.deposits]])
export const useDeleteDeposit = () => useRemove('deposits', [[...qk.deposits]])

// --- Vay / cho vay ---
export function useDebts(enabled: boolean) {
  return useQuery({
    queryKey: qk.debts,
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .order('occurred_at', { ascending: false })
      if (error) throw error
      return ((data ?? []) as Debt[]).map((d) => ({
        ...d,
        amount: num(d.amount),
        paid_amount: num(d.paid_amount),
      }))
    },
  })
}
export const useSaveDebt = () => useUpsert<Partial<Debt>>('debts', [[...qk.debts]])
export const useDeleteDebt = () => useRemove('debts', [[...qk.debts]])

// --- Hoa don dinh ky ---
export function useBills(enabled: boolean) {
  return useQuery({
    queryKey: qk.bills,
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_bills')
        .select('*')
        .order('day_of_month', { ascending: true })
      if (error) throw error
      return ((data ?? []) as RecurringBill[]).map((b) => ({ ...b, amount: num(b.amount) }))
    },
  })
}
export const useSaveBill = () => useUpsert<Partial<RecurringBill>>('recurring_bills', [[...qk.bills]])
export const useDeleteBill = () => useRemove('recurring_bills', [[...qk.bills]])

// ---------------------------------------------------------------------------
// Nhat ky hoat dong - chi doc, do trigger ben database ghi ra
// ---------------------------------------------------------------------------

/** Bao nhieu dong gan nhat duoc tai ve. Du de tra loi "vua roi ai lam gi". */
const ACTIVITY_LIMIT = 200

export function useActivityLog(enabled: boolean) {
  return useQuery({
    queryKey: qk.activity,
    enabled,
    staleTime: 15_000,
    // Chua chay migration 0003 thi bang nay chua ton tai. Thu lai 3 lan cung
    // khong lam no hien ra, chi lam nguoi dung ngoi cho lau hon.
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(ACTIVITY_LIMIT)
      if (error) throw error
      return (data ?? []) as ActivityLog[]
    },
  })
}

// ---------------------------------------------------------------------------
// Realtime: hai dien thoai thay thay doi cua nhau ngay lap tuc
// ---------------------------------------------------------------------------

const REALTIME_MAP: Record<string, readonly unknown[][]> = {
  transactions: [['transactions'], [...qk.balances]],
  categories: [[...qk.categories]],
  accounts: [[...qk.accounts], [...qk.balances]],
  activity_log: [[...qk.activity]],
  budgets: [['budgets']],
  savings_goals: [[...qk.goals]],
  savings_entries: [[...qk.savingsEntries]],
  deposits: [[...qk.deposits]],
  debts: [[...qk.debts]],
  recurring_bills: [[...qk.bills]],
  profiles: [[...qk.members], [...qk.profile]],
  households: [[...qk.household]],
}

export function useRealtimeSync(householdId: string | undefined) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!householdId) return

    const channel = supabase.channel(`household:${householdId}`)

    for (const table of Object.keys(REALTIME_MAP)) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        REALTIME_MAP[table].forEach((key) => qc.invalidateQueries({ queryKey: key }))
      })
    }

    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [householdId, qc])

  // iOS dong bang WebSocket khi app xuong nen -> lay lai du lieu khi quay lai.
  useEffect(() => {
    const refetch = () => {
      if (document.visibilityState === 'visible') qc.invalidateQueries()
    }
    document.addEventListener('visibilitychange', refetch)
    window.addEventListener('online', refetch)
    return () => {
      document.removeEventListener('visibilitychange', refetch)
      window.removeEventListener('online', refetch)
    }
  }, [qc])
}
