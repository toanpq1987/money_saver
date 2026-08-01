export type MemberRole = 'husband' | 'wife' | 'other'
export type TxType = 'expense' | 'income' | 'transfer'
export type CategoryKind = 'expense' | 'income'
export type AccountKind = 'cash' | 'bank' | 'ewallet' | 'credit'

export interface Household {
  id: string
  name: string
  invite_code: string
  currency: string
  created_at: string
}

export interface Profile {
  id: string
  household_id: string
  display_name: string
  role: MemberRole
  avatar_emoji: string
  color: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  household_id: string
  name: string
  icon: string
  color: string
  kind: CategoryKind
  sort_order: number
  archived: boolean
  created_at: string
}

export interface Account {
  id: string
  household_id: string
  owner_id: string | null
  name: string
  kind: AccountKind
  icon: string
  color: string
  opening_balance: number
  archived: boolean
  sort_order: number
  created_at: string
}

export interface AccountBalance {
  account_id: string
  household_id: string
  balance: number
}

export interface Transaction {
  id: string
  household_id: string
  type: TxType
  amount: number
  occurred_at: string
  category_id: string | null
  account_id: string | null
  to_account_id: string | null
  payer_id: string
  is_shared: boolean
  note: string
  created_by: string
  created_at: string
  updated_at: string
  /** Chi co o may khach: ban ghi dang nam trong hang doi, chua len may chu. */
  _pending?: boolean
}

export interface Budget {
  id: string
  household_id: string
  category_id: string
  month: string
  amount: number
  created_at: string
}

export interface SavingsGoal {
  id: string
  household_id: string
  name: string
  target_amount: number
  deadline: string | null
  icon: string
  color: string
  note: string
  archived: boolean
  created_at: string
}

export interface SavingsEntry {
  id: string
  household_id: string
  goal_id: string
  amount: number
  direction: 'in' | 'out'
  occurred_at: string
  note: string
  profile_id: string
  created_at: string
}

export type InterestType = 'end' | 'monthly' | 'compound'

export interface Deposit {
  id: string
  household_id: string
  bank_name: string
  principal: number
  interest_rate: number
  term_months: number
  opened_at: string
  interest_type: InterestType
  owner_id: string | null
  note: string
  status: 'active' | 'closed'
  created_at: string
}

export interface Debt {
  id: string
  household_id: string
  direction: 'lend' | 'borrow'
  counterparty: string
  amount: number
  paid_amount: number
  due_date: string | null
  occurred_at: string
  note: string
  profile_id: string | null
  settled: boolean
  created_at: string
}

export interface RecurringBill {
  id: string
  household_id: string
  name: string
  amount: number
  category_id: string | null
  account_id: string | null
  day_of_month: number
  active: boolean
  last_paid_on: string | null
  note: string
  created_at: string
}

/** Bo loc "Tat ca / Chong / Vo" o dau man hinh. */
export type MemberFilter = string | 'all'
