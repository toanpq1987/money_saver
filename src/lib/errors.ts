/**
 * Doc thong bao loi tu bat ky thu gi bi nem ra.
 *
 * Ly do can ham nay: Supabase KHONG nem ra Error, no tra ve mot object thuong
 * dang { message, code, details, hint }. Neu viet
 *
 *     e instanceof Error ? e.message : 'Luu that bai'
 *
 * thi voi loi cua Supabase se roi vao ve sau va nguoi dung chi thay dong chu
 * chung chung; con `String(e)` thi ra thang "[object Object]". Ca hai deu lam
 * mat sach thong tin can de biet chuyen gi da xay ra.
 */
export function errorMessage(e: unknown, fallback = 'Có lỗi xảy ra, thử lại nhé'): string {
  if (e === null || e === undefined) return fallback
  if (typeof e === 'string') return e.trim() || fallback
  if (e instanceof Error && e.message) return e.message

  if (typeof e === 'object') {
    const o = e as Record<string, unknown>
    const text = (['message', 'error_description', 'error', 'details', 'hint'] as const)
      .map((k) => o[k])
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .join(' · ')

    if (text) {
      // Giu lai ma loi cua Postgres - rat huu ich khi can tra cuu nguyen nhan.
      const code = typeof o.code === 'string' || typeof o.code === 'number' ? o.code : null
      return code ? `${text} (${code})` : text
    }
  }

  return fallback
}
