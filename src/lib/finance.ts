import { dayjs } from './format'
import type { Deposit, InterestType } from './types'

export interface DepositMath {
  maturityDate: string
  daysLeft: number
  matured: boolean
  /** Tien lai du kien cho toan bo ky han. */
  totalInterest: number
  /** Goc + lai khi den han. */
  maturityValue: number
  /** Lai binh quan moi thang. */
  monthlyInterest: number
  /** Tien lai da tich luy den hom nay (uoc tinh theo so ngay da gui). */
  accruedInterest: number
}

/**
 * Tinh lai so tiet kiem.
 *  - 'end'      : lai don, nhan mot lan cuoi ky
 *  - 'monthly'  : lai don, tra hang thang (tong lai bang 'end')
 *  - 'compound' : lai nhap goc hang thang (tai tuc)
 */
export function depositMath(d: Pick<Deposit,
  'principal' | 'interest_rate' | 'term_months' | 'opened_at' | 'interest_type'
>): DepositMath {
  const principal = d.principal
  const annual = d.interest_rate / 100
  const months = d.term_months
  const type: InterestType = d.interest_type

  let totalInterest: number
  if (type === 'compound') {
    const monthlyRate = annual / 12
    totalInterest = principal * (Math.pow(1 + monthlyRate, months) - 1)
  } else {
    totalInterest = principal * annual * (months / 12)
  }

  const opened = dayjs(d.opened_at)
  const maturity = opened.add(months, 'month')
  const totalDays = Math.max(1, maturity.diff(opened, 'day'))
  const elapsedDays = Math.max(0, Math.min(totalDays, dayjs().diff(opened, 'day')))

  return {
    maturityDate: maturity.format('YYYY-MM-DD'),
    daysLeft: maturity.diff(dayjs(), 'day'),
    matured: !maturity.isAfter(dayjs()),
    totalInterest,
    maturityValue: principal + totalInterest,
    monthlyInterest: months ? totalInterest / months : 0,
    accruedInterest: totalInterest * (elapsedDays / totalDays),
  }
}

export const INTEREST_LABELS: Record<InterestType, string> = {
  end: 'Lãnh lãi cuối kỳ',
  monthly: 'Lãi trả hàng tháng',
  compound: 'Lãi nhập gốc (tái tục)',
}

/** Moi thang can gui bao nhieu de kip han cua muc tieu tiet kiem. */
export function monthlyNeeded(remaining: number, deadline: string | null): number | null {
  if (!deadline || remaining <= 0) return null
  const months = dayjs(deadline).diff(dayjs(), 'month', true)
  if (months <= 0) return remaining
  return remaining / months
}
