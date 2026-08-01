import clsx from 'clsx'
import { CloudOff, RefreshCw } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { flushOutbox, getOutboxCount, subscribeOutbox } from '@/lib/outbox'

/** Theo doi so thao tac dang cho gui len may chu. */
export function usePendingCount(): number {
  return useSyncExternalStore(subscribeOutbox, getOutboxCount, getOutboxCount)
}

/** Theo doi trang thai mang cua may. */
export function useIsOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  )

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  return online
}

/**
 * Thanh mong hien ngay tren thanh dieu huong. Chi xuat hien khi mat mang
 * hoac con thao tac chua gui len - luc binh thuong khong chiem cho.
 */
export function SyncStatus() {
  const pending = usePendingCount()
  const online = useIsOnline()
  const [syncing, setSyncing] = useState(false)

  // Vua co mang lai -> hien trang thai "dang gui" trong luc day hang doi.
  useEffect(() => {
    if (!online || pending === 0) return
    setSyncing(true)
    void flushOutbox().finally(() => setSyncing(false))
  }, [online, pending])

  if (online && pending === 0) return null

  const message = !online
    ? pending > 0
      ? `Ngoại tuyến · ${pending} thay đổi chờ gửi`
      : 'Ngoại tuyến · vẫn ghi chép được'
    : syncing
      ? `Đang đồng bộ ${pending} thay đổi…`
      : `${pending} thay đổi chờ gửi`

  return (
    // Dat cao hon nut "+" mot chut de hai thu khong de len nhau.
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--sab)+5rem)] z-30 mx-auto flex max-w-lg justify-center px-4"
    >
      <div
        className={clsx(
          'flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-semibold text-white shadow-lg',
          online ? 'bg-brand-600' : 'bg-ink-700',
        )}
      >
        {online ? (
          <RefreshCw size={14} className={syncing ? 'animate-spin' : undefined} />
        ) : (
          <CloudOff size={14} />
        )}
        {message}
      </div>
    </div>
  )
}
