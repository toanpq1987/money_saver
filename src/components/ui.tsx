import clsx from 'clsx'
import { Loader2, X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { groupDigits, parseMoneyInput } from '@/lib/format'

// ---------------------------------------------------------------------------
// Bottom sheet - kieu modal quen thuoc tren iOS
// ---------------------------------------------------------------------------

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 animate-fade-in bg-ink-950/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[92vh] w-full max-w-lg animate-slide-up flex-col
                   rounded-t-3xl bg-ink-50 shadow-sheet dark:bg-ink-950 sm:mb-4 sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink-200/60 px-5 py-4 dark:border-white/10">
          <h2 className="truncate text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-full p-2 text-ink-500 transition hover:bg-ink-200/60 dark:hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>

        {footer && (
          <div className="safe-bottom border-t border-ink-200/60 px-5 py-4 dark:border-white/10">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ---------------------------------------------------------------------------
// Nut chuyen doi dang thanh (Chi / Thu / Chuyen khoan ...)
// ---------------------------------------------------------------------------

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; activeClass?: string }[]
  className?: string
}) {
  return (
    <div
      className={clsx(
        'flex gap-1 rounded-2xl bg-ink-200/60 p-1 dark:bg-white/5',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={clsx(
              'flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition active:scale-95',
              active
                ? o.activeClass ?? 'bg-white text-ink-950 shadow-sm dark:bg-ink-800 dark:text-white'
                : 'text-ink-500 dark:text-ink-400',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// O nhap tien: tu them dau cham hang nghin, ho tro go tat 50k / 1,2tr
// ---------------------------------------------------------------------------

export function MoneyInput({
  value,
  onChange,
  autoFocus,
  placeholder = '0',
  className,
}: {
  value: number
  onChange: (v: number) => void
  autoFocus?: boolean
  placeholder?: string
  className?: string
}) {
  const [text, setText] = useState(() => (value ? groupDigits(String(value)) : ''))
  const [focused, setFocused] = useState(false)

  // Dong bo khi gia tri doi tu ben ngoai (vd: mo sua mot giao dich khac).
  // Khong dong bo trong luc dang go, neu khong se xoa mat ky tu vua nhap.
  useEffect(() => {
    if (focused) return
    setText(value ? groupDigits(String(value)) : '')
  }, [value, focused])

  const handle = (raw: string) => {
    // Chi toan chu so va dau cham => day la so thuong, tu them dau phan cach
    // hang nghin ngay khi go. Con lai ("50k", "1,2tr") thi giu nguyen chu
    // nguoi dung go va chi doc gia tri, de khong pha dau phay thap phan.
    const plain = /^[\d.\s]*$/.test(raw)
    setText(plain ? groupDigits(raw) : raw)
    onChange(plain ? Number(raw.replace(/\D/g, '')) || 0 : parseMoneyInput(raw))
  }

  return (
    <div className={clsx('relative', className)}>
      <input
        inputMode="decimal"
        autoFocus={autoFocus}
        value={text}
        placeholder={placeholder}
        onChange={(e) => handle(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          setText(value ? groupDigits(String(value)) : '')
        }}
        className="field pr-10 text-right text-2xl font-bold tabular-nums"
      />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-ink-400">
        ₫
      </span>
    </div>
  )
}

/** Cac nut cong nhanh duoi o nhap tien. */
export function QuickAmounts({
  onPick,
  values = [10_000, 20_000, 50_000, 100_000, 200_000, 500_000],
}: {
  onPick: (delta: number) => void
  values?: number[]
}) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-2">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onPick(v)}
          className="chip bg-ink-200/60 text-ink-700 dark:bg-white/5 dark:text-ink-200"
        >
          +{v >= 1_000_000 ? `${v / 1_000_000}tr` : `${v / 1_000}k`}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cac manh nho
// ---------------------------------------------------------------------------

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('animate-spin', className)} size={18} />
}

export function FullPageLoader({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-ink-500">
      <Spinner className="h-6 w-6" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-ink-200/50 text-3xl dark:bg-white/5">
        {icon}
      </div>
      <p className="font-semibold">{title}</p>
      {hint && <p className="max-w-xs text-sm text-ink-500">{hint}</p>}
      {action}
    </div>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  const id = useId()
  return (
    <div className="mb-4">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}
    </div>
  )
}

/** Thanh tien do dung cho ngan sach & quy tiet kiem. */
export function ProgressBar({
  value,
  color = '#328ffb',
  danger,
}: {
  value: number
  color?: string
  danger?: boolean
}) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-200/70 dark:bg-white/10">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${clamped}%`, background: danger ? '#ef4444' : color }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hop thoai xac nhan dung chung toan app
// ---------------------------------------------------------------------------

type ConfirmOptions = { title: string; message?: string; confirmLabel?: string; danger?: boolean }
type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn>(async () => false)
export const useConfirm = () => useContext(ConfirmContext)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null)

  const confirm = useCallback<ConfirmFn>(
    (opts) => new Promise<boolean>((resolve) => setState({ ...opts, resolve })),
    [],
  )

  const close = (result: boolean) => {
    state?.resolve(result)
    setState(null)
  }

  const value = useMemo(() => confirm, [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Sheet open={Boolean(state)} onClose={() => close(false)} title={state?.title}>
        <p className="text-[15px] text-ink-600 dark:text-ink-300">{state?.message}</p>
        <div className="mt-6 flex gap-3">
          <button className="btn-ghost flex-1" onClick={() => close(false)}>
            Huỷ
          </button>
          <button
            className={state?.danger ? 'btn btn-danger flex-1' : 'btn-primary flex-1'}
            onClick={() => close(true)}
          >
            {state?.confirmLabel ?? 'Đồng ý'}
          </button>
        </div>
      </Sheet>
    </ConfirmContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Thong bao ngan (toast)
// ---------------------------------------------------------------------------

type Toast = { id: number; message: string; tone: 'ok' | 'error' }
const ToastContext = createContext<(message: string, tone?: 'ok' | 'error') => void>(() => {})
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])

  const push = useCallback((message: string, tone: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random()
    setItems((xs) => [...xs, { id, message, tone }])
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 2600)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[calc(var(--sat)+0.75rem)]">
        {items.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'animate-fade-in rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg',
              t.tone === 'ok' ? 'bg-ink-900/95' : 'bg-red-600/95',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
