import { ConflictError } from './errors'
import { supabase } from './supabase'

/**
 * Hang doi ghi offline ("outbox").
 *
 * Cach hoat dong:
 *  1. Moi thao tac ghi deu duoc dong goi thanh mot OutboxOp.
 *  2. Con mang  -> gui thang len Supabase.
 *     Mat mang  -> xep vao hang doi luu trong localStorage.
 *  3. Co mang lai -> day lan luot theo dung thu tu da xep.
 *
 * Diem mau chot: id cua ban ghi duoc sinh o MAY KHACH truoc khi gui.
 * Nho vay mot ban ghi tao khi offline roi sua tiep cung khi offline van
 * tro dung ve mot dong duy nhat, khong can anh xa id tam -> id that.
 */

export type OutboxAction = 'insert' | 'update' | 'upsert' | 'delete'

export interface OutboxOp {
  /** Id cua chinh thao tac (khong phai id ban ghi). */
  opId: string
  queuedAt: number
  table: string
  action: OutboxAction
  values?: Record<string, unknown>
  /** Dieu kien loc cho update / delete. */
  match?: Record<string, string>
  /**
   * "Chi ghi de neu cac o nay VAN dang giu dung gia tri toi da doc." Khong
   * khop dong nao => ConflictError.
   *
   * Khoa theo TUNG O chu khong theo ca dong: neu khoa ca dong thi vo sua so
   * tien, chong sua ghi chu - hai o khac han nhau - van bi chan, dung cai
   * tinh huong ma viec chi gui o da doi sinh ra de xu ly em xuoi.
   *
   * Khong bao gio duoc luu xuong hang doi: xem enqueue().
   */
  guard?: Record<string, string | number | boolean | null>
  onConflict?: string
}

const STORAGE_KEY = 'moneysaver.outbox.v1'

// ---------------------------------------------------------------------------
// Luu tru
// ---------------------------------------------------------------------------

function load(): OutboxOp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as OutboxOp[]) : []
  } catch {
    return []
  }
}

let queue: OutboxOp[] = load()

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  } catch {
    // Het dung luong: van giu hang doi trong bo nho de phien nay khong mat.
  }
}

// ---------------------------------------------------------------------------
// Theo doi thay doi (cho thanh trang thai dong bo)
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>()
let pendingCount = queue.length

function notify() {
  pendingCount = queue.length
  listeners.forEach((fn) => fn())
}

export function subscribeOutbox(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** useSyncExternalStore doi gia tri on dinh giua cac lan goi -> tra ve so. */
export function getOutboxCount(): number {
  return pendingCount
}

/** Duoc goi sau khi day thanh cong, de app tai lai du lieu that tu may chu. */
let onSynced: (() => void) | null = null
export function setOutboxSyncHandler(fn: (() => void) | null) {
  onSynced = fn
}

// ---------------------------------------------------------------------------
// Phan biet loi mang voi loi du lieu
// ---------------------------------------------------------------------------

function messageOf(e: unknown): string {
  if (typeof e === 'string') return e
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message?: unknown }).message ?? '')
  }
  return ''
}

/**
 * True khi yeu cau khong toi duoc may chu (nen xep hang doi va thu lai).
 * False khi may chu da tra loi bao loi (du lieu sai -> thu lai cung vo ich).
 */
export function isNetworkError(e: unknown): boolean {
  // Loi tu PostgREST/Postgres luon kem ma loi => may chu da nhan duoc yeu cau.
  if (e && typeof e === 'object' && 'code' in e && (e as { code?: unknown }).code) return false
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  // fetch that bai ngay tu dau nem TypeError. Safari ghi la "Load failed".
  if (e instanceof TypeError) return true
  return /failed to fetch|load failed|network|timed? ?out|connection|offline/i.test(messageOf(e))
}

export const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false)

// ---------------------------------------------------------------------------
// Gui va day hang doi
// ---------------------------------------------------------------------------

async function execute(op: OutboxOp): Promise<void> {
  const table = supabase.from(op.table)
  let error: unknown = null

  switch (op.action) {
    case 'insert':
      ({ error } = await table.insert(op.values ?? {}))
      break
    case 'upsert':
      ({ error } = await table.upsert(
        op.values ?? {},
        op.onConflict ? { onConflict: op.onConflict } : undefined,
      ))
      break
    case 'update': {
      let q = table.update(op.values ?? {}).match(op.match ?? {})
      for (const [column, expected] of Object.entries(op.guard ?? {})) {
        // Cot rong phai dung .is(): `eq.null` khong so sanh duoc voi NULL.
        q = expected === null ? q.is(column, null) : q.eq(column, expected)
      }

      // Phai .select() moi biet lenh co cham vao dong nao khong: PostgREST coi
      // update trung 0 dong la THANH CONG. Khong kiem tra thi app bao "Da luu"
      // trong khi ban ghi da bi nguoi kia xoa mat tu doi nao.
      const { data, error: updateError } = await q.select('id')

      if (updateError) throw updateError
      if (!data || data.length === 0) throw new ConflictError()
      return
    }
    case 'delete':
      ({ error } = await table.delete().match(op.match ?? {}))
      break
  }

  if (error) throw error
}

function enqueue(op: Omit<OutboxOp, 'opId' | 'queuedAt'>) {
  // Bo `guard` truoc khi xep hang doi. Thao tac nam trong hang doi co the toi
  // may chu sau ca ngay - luc do `updated_at` gan nhu chac chan da khac, nen
  // giu guard lai thi moi lan ghi offline deu bi tu choi. Da chon offline la
  // "ai gui sau thi thang", va hoi nguoi dung ve mot viec ho lam hom qua thi
  // roi hon la giup. Dau vet van con day du trong nhat ky hoat dong.
  const { guard: _dropped, ...rest } = op
  queue.push({ ...rest, opId: newId(), queuedAt: Date.now() })
  save()
  notify()
}

/**
 * Gui ngay neu duoc, khong duoc thi xep hang doi.
 * @returns true neu thao tac dang cho gui (chua len may chu).
 */
export async function sendOrQueue(op: Omit<OutboxOp, 'opId' | 'queuedAt'>): Promise<boolean> {
  // Con viec cho san thi thao tac moi phai xep sau, giu dung thu tu.
  if (!isOnline() || queue.length > 0) {
    enqueue(op)
    void flushOutbox()
    return true
  }
  try {
    await execute({ ...op, opId: newId(), queuedAt: Date.now() })
    return false
  } catch (e) {
    if (isNetworkError(e)) {
      enqueue(op)
      return true
    }
    throw e
  }
}

let flushing = false

/** Day toan bo hang doi len may chu. An toan khi goi nhieu lan. */
export async function flushOutbox(): Promise<{ sent: number; dropped: number }> {
  if (flushing || queue.length === 0 || !isOnline()) return { sent: 0, dropped: 0 }

  flushing = true
  let sent = 0
  let dropped = 0

  try {
    while (queue.length > 0) {
      const op = queue[0]
      try {
        await execute(op)
        sent++
      } catch (e) {
        if (isNetworkError(e)) break // Van chua co mang - de danh, thu lai sau.
        // May chu tu choi (vd ban ghi da bi nguoi kia xoa). Thu lai cung
        // khong khac duoc, bo qua de khong ket cung ca hang doi.
        console.warn('[outbox] bỏ qua thao tác lỗi:', op, e)
        dropped++
      }
      queue.shift()
      save()
      notify()
    }
  } finally {
    flushing = false
    notify()
  }

  if (sent > 0) onSynced?.()
  return { sent, dropped }
}

/** Xoa sach hang doi - dung khi dang xuat. */
export function clearOutbox() {
  queue = []
  save()
  notify()
}

/** Thoi diem thao tac cu nhat con cho, de hien "cho tu ...". */
export function oldestPendingAt(): number | null {
  return queue.length ? queue[0].queuedAt : null
}

// ---------------------------------------------------------------------------
// Tien ich
// ---------------------------------------------------------------------------

/** crypto.randomUUID can HTTPS; du phong cho truong hop khong co. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes)
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Tu day hang doi khi may co mang tro lai hoac khi mo lai app. */
export function startOutboxAutoFlush(): () => void {
  const attempt = () => void flushOutbox()

  window.addEventListener('online', attempt)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') attempt()
  })
  // Thu lai dinh ky phong khi su kien 'online' khong ban (hay gap tren iOS).
  const timer = window.setInterval(attempt, 30_000)
  attempt()

  return () => {
    window.removeEventListener('online', attempt)
    window.clearInterval(timer)
  }
}
