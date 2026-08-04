/**
 * So form dang sua voi ban da doc luc mo form, chi giu lai nhung o that su doi.
 *
 * Vi sao can: hai vo chong cung mo mot giao dich. Vo sua so tien, chong sua
 * ghi chu. Neu moi lan Luu deu gui TOAN BO cac o len thi nguoi bam sau se ghi
 * de ca nhung o minh khong dong toi - thay doi cua nguoi kia bien mat du hai
 * nguoi sua hai cho khac han nhau. Chi gui o da doi thi hai thay doi song
 * duoc voi nhau, va hop thoai canh bao chi con bat khi thuc su dung mot o.
 */
export function changedFields<T extends Record<string, unknown>>(
  baseline: Record<string, unknown> | null | undefined,
  next: T,
): Partial<T> {
  if (!baseline) return { ...next }

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(next)) {
    if (!sameValue(baseline[key], value)) out[key] = value
  }
  return out as Partial<T>
}

/**
 * Cac o da doi, kem ca gia tri cu - dung de ke cho nguoi dung nghe "nguoi kia
 * vua doi So tien 200.000 -> 250.000".
 */
export function diffRecords(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): Record<string, { from: unknown; to: unknown }> {
  if (!before || !after) return {}

  const out: Record<string, { from: unknown; to: unknown }> = {}
  for (const key of Object.keys(changedFields(before, after))) {
    out[key] = { from: before[key], to: after[key] }
  }
  return out
}

/**
 * So sanh mot o, chap nhan vai kieu lech vo hai giua database va form:
 *  - cot rong tra ve `null`, con o chua dien trong form la `undefined`
 *  - numeric cua Postgres co the ve duoi dang chuoi "200000.00"
 */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return a == null && b == null

  if (typeof a === 'number' || typeof b === 'number') {
    const na = Number(a)
    const nb = Number(b)
    return !Number.isNaN(na) && !Number.isNaN(nb) && na === nb
  }

  return false
}
