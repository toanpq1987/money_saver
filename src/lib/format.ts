import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import isoWeek from 'dayjs/plugin/isoWeek'
import relativeTime from 'dayjs/plugin/relativeTime'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(isoWeek)
dayjs.extend(relativeTime)
dayjs.extend(customParseFormat)
dayjs.locale('vi')

export { dayjs }

const vnd = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

/** 1234567 -> "1.234.567" */
export function formatNumber(value: number): string {
  return vnd.format(Math.round(value))
}

/** 1234567 -> "1.234.567 ₫"  (them dau - neu am) */
export function formatMoney(value: number, opts?: { sign?: boolean }): string {
  const rounded = Math.round(value)
  const body = `${vnd.format(Math.abs(rounded))} ₫`
  if (rounded < 0) return `-${body}`
  if (opts?.sign && rounded > 0) return `+${body}`
  return body
}

/**
 * Rut gon cho cho hep: 1.250.000 -> "1,25tr", 45.000 -> "45k", 2.4e9 -> "2,4 tỷ"
 */
export function formatCompact(value: number): string {
  const n = Math.abs(Math.round(value))
  const sign = value < 0 ? '-' : ''
  const trim = (x: number, d = 1) =>
    x.toFixed(d).replace(/\.0+$/, '').replace('.', ',')
  if (n >= 1_000_000_000) return `${sign}${trim(n / 1_000_000_000, 2)} tỷ`
  if (n >= 1_000_000) return `${sign}${trim(n / 1_000_000)}tr`
  if (n >= 1_000) return `${sign}${trim(n / 1_000, 0)}k`
  return `${sign}${n}`
}

/**
 * Doc so tien nguoi dung go. Ho tro hau to nhanh:
 *   "50k" -> 50000 | "1.2tr" hoac "1,2tr" -> 1200000 | "2ty" -> 2000000000
 * Bo qua moi dau cham/phay phan cach hang nghin.
 */
export function parseMoneyInput(raw: string): number {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '')
  if (!s) return 0

  const m = s.match(/^([\d.,]+)(k|tr|trieu|triệu|ty|tỷ|b|m)?$/)
  if (!m) return 0

  const [, numPart, suffix] = m
  // Neu co hau to, dau . hoac , la dau thap phan ("1,5tr").
  // Neu khong, chung chi la dau phan cach hang nghin ("1.500.000").
  let n: number
  if (suffix) {
    n = Number(numPart.replace(/\./g, '.').replace(/,/g, '.'))
  } else {
    n = Number(numPart.replace(/[.,]/g, ''))
  }
  if (!Number.isFinite(n)) return 0

  switch (suffix) {
    case 'k':
      return Math.round(n * 1_000)
    case 'tr':
    case 'trieu':
    case 'triệu':
    case 'm':
      return Math.round(n * 1_000_000)
    case 'ty':
    case 'tỷ':
    case 'b':
      return Math.round(n * 1_000_000_000)
    default:
      return Math.round(n)
  }
}

/** Nhom dau hang nghin khi dang go, giu nguyen phan dang nhap do. */
export function groupDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return vnd.format(Number(digits))
}

export const monthKey = (d: dayjs.Dayjs | string | Date) => dayjs(d).format('YYYY-MM-01')
export const dateKey = (d: dayjs.Dayjs | string | Date) => dayjs(d).format('YYYY-MM-DD')

export function formatDayLabel(date: string): string {
  const d = dayjs(date)
  const today = dayjs().startOf('day')
  if (d.isSame(today, 'day')) return 'Hôm nay'
  if (d.isSame(today.subtract(1, 'day'), 'day')) return 'Hôm qua'
  const label = d.format('dddd, D [tháng] M')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatMonthLabel(month: string): string {
  return `Tháng ${dayjs(month).format('M/YYYY')}`
}

/** Phan tram an toan, khong chia cho 0. */
export function pct(part: number, total: number): number {
  if (!total) return 0
  return Math.round((part / total) * 100)
}
