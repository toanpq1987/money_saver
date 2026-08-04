import { formatMoney } from './format'
import type { ActivityLog } from './types'

/**
 * Doi mot dong nhat ky tho tu database thanh cau tieng Viet doc duoc.
 *
 * Trigger ben database ghi nguyen ten cot va gia tri tho (`category_id` cua
 * mot uuid nao do). Cho nay lam nhiem vu dich sang thu nguoi dung hieu duoc.
 * Dung chung cho ca trang Nhat ky va hop thoai canh bao ghi de.
 */

export interface ActivityNames {
  category: (id: string | null) => string
  account: (id: string | null) => string
  member: (id: string | null) => string
}

const FIELD_LABELS: Record<string, string> = {
  // transactions
  amount: 'Số tiền',
  type: 'Loại',
  occurred_at: 'Ngày',
  category_id: 'Danh mục',
  account_id: 'Ví / tài khoản',
  to_account_id: 'Đến ví',
  payer_id: 'Người chi',
  is_shared: 'Khoản chung',
  note: 'Ghi chú',
  // accounts
  name: 'Tên',
  kind: 'Loại',
  icon: 'Biểu tượng',
  color: 'Màu',
  opening_balance: 'Số dư ban đầu',
  owner_id: 'Nằm trong ví',
  archived: 'Đã ẩn',
  sort_order: 'Thứ tự',
}

const TX_TYPES: Record<string, string> = {
  expense: 'Chi',
  income: 'Thu',
  transfer: 'Chuyển',
}

const ACCOUNT_KINDS: Record<string, string> = {
  cash: 'Tiền mặt',
  bank: 'Ngân hàng',
  ewallet: 'Ví điện tử',
  credit: 'Thẻ tín dụng',
}

export const fieldLabel = (field: string): string => FIELD_LABELS[field] ?? field

/** Cac o khong dang bay ra truoc mat nguoi dung. */
const HIDDEN_FIELDS = new Set(['id', 'household_id', 'created_at', 'updated_at', 'created_by'])

export function formatFieldValue(field: string, value: unknown, names: ActivityNames): string {
  if (value === null || value === undefined || value === '') return '(trống)'

  switch (field) {
    case 'amount':
    case 'opening_balance':
      return formatMoney(Number(value))
    case 'type':
      return TX_TYPES[String(value)] ?? String(value)
    case 'kind':
      return ACCOUNT_KINDS[String(value)] ?? String(value)
    case 'category_id':
      return names.category(String(value))
    case 'account_id':
    case 'to_account_id':
      return names.account(String(value))
    case 'payer_id':
    case 'owner_id':
      return names.member(String(value))
    case 'is_shared':
      return value ? 'Chung của gia đình' : 'Riêng cá nhân'
    case 'archived':
      return value ? 'Có' : 'Không'
    default:
      return String(value)
  }
}

export interface ChangeLine {
  field: string
  label: string
  from: string
  to: string
}

/** Doc cot `changed` cua nhat ky thanh danh sach dong "Số tiền: A → B". */
export function describeChanges(
  changed: ActivityLog['changed'],
  names: ActivityNames,
): ChangeLine[] {
  if (!changed) return []
  return Object.entries(changed)
    .filter(([field]) => !HIDDEN_FIELDS.has(field))
    .map(([field, diff]) => ({
      field,
      label: fieldLabel(field),
      from: formatFieldValue(field, diff?.from, names),
      to: formatFieldValue(field, diff?.to, names),
    }))
}

/**
 * Mot dong tom tat de biet dong nhat ky nay noi ve khoan nao.
 * Uu tien ghi chu, khong co thi lay danh muc, cuoi cung moi den so tien.
 */
export function describeRecord(log: ActivityLog, names: ActivityNames): string {
  const snap = log.snapshot
  if (!snap) return ''

  if (log.table_name === 'accounts') {
    return String(snap.name ?? 'Tài khoản')
  }

  const parts: string[] = []
  const note = typeof snap.note === 'string' ? snap.note.trim() : ''
  if (note) parts.push(note)
  else if (snap.category_id) parts.push(names.category(String(snap.category_id)))

  if (snap.amount != null) parts.push(formatMoney(Number(snap.amount)))
  return parts.join(' · ')
}

export const ACTION_LABELS: Record<ActivityLog['action'], string> = {
  insert: 'Thêm',
  update: 'Sửa',
  delete: 'Xoá',
}

export const TABLE_LABELS: Record<string, string> = {
  transactions: 'giao dịch',
  accounts: 'tài khoản',
}
