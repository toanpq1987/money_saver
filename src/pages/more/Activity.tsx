import clsx from 'clsx'
import { ChevronRight, History, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SubHeader } from '@/components/AppShell'
import { TransactionSheet } from '@/components/TransactionSheet'
import { EmptyState, Spinner, useToast } from '@/components/ui'
import { useActivityNames } from '@/hooks/useActivityNames'
import { useApp } from '@/hooks/useApp'
import {
  ACTION_LABELS,
  TABLE_LABELS,
  describeChanges,
  describeRecord,
  shortId,
} from '@/lib/activity'
import { errorMessage } from '@/lib/errors'
import { dayjs } from '@/lib/format'
import { fetchTransaction, useActivityLog } from '@/lib/queries'
import type { ActivityLog, Transaction } from '@/lib/types'

/**
 * Nhat ky hoat dong.
 *
 * Ly do co trang nay: hai vo chong dung chung mot so, thinh thoang mot khoan
 * bi doi hoac bien mat ma khong ai nho. Cac cach chan ghi de o tang duoi chi
 * NGAN duoc xung dot; con day la cho de TRA CUU khi chuyen da xay ra - ai
 * lam, luc nao, tu gia tri nao sang gia tri nao.
 */

const ACTION_STYLES: Record<ActivityLog['action'], { icon: typeof Plus; className: string }> = {
  insert: { icon: Plus, className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  update: { icon: Pencil, className: 'bg-brand-600/10 text-brand-600 dark:text-brand-400' },
  delete: { icon: Trash2, className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
}

export default function Activity() {
  const { household, members } = useApp()
  const names = useActivityNames()
  const toast = useToast()
  const navigate = useNavigate()
  const { data, isLoading, error } = useActivityLog(Boolean(household))

  const [editing, setEditing] = useState<Transaction | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)

  const groups = useMemo(() => groupByDay(data ?? []), [data])

  /**
   * Bam vao mot dong nhat ky thi mo dung ban ghi do ra.
   *
   * Day moi la cau tra loi that cho "dong nay noi ve giao dich nao": doc mo
   * ta roi doan thi bao gio cung co the nham, con mo ra xem thi khong.
   */
  const openRecord = async (log: ActivityLog) => {
    if (log.table_name === 'accounts') {
      navigate('/more/accounts')
      return
    }
    if (log.table_name !== 'transactions') return

    if (log.action === 'delete') {
      toast('Giao dịch này đã bị xoá khỏi sổ')
      return
    }

    setOpeningId(log.id)
    try {
      const tx = await fetchTransaction(log.record_id)
      if (tx) setEditing(tx)
      else toast('Giao dịch này không còn trong sổ nữa')
    } catch (e) {
      toast(errorMessage(e, 'Không mở được giao dịch'), 'error')
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <div className="page-pad">
      <SubHeader title="Nhật ký" subtitle="Ai đã thêm, sửa, xoá gì gần đây" />

      <div className="px-4">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6 text-ink-400" />
          </div>
        )}

        {/*
          Bang nhat ky nam trong migration 0003. Neu chua chay file do tren
          Supabase thi truy van se loi - noi thang ra thay vi de man hinh
          trong khong, vi day la viec phai lam bang tay mot lan.
        */}
        {!isLoading && error && (
          <EmptyState
            icon={<History size={26} />}
            title="Chưa bật nhật ký"
            hint="Cần chạy file supabase/migrations/20260804140000_activity_log.sql trong SQL Editor của Supabase một lần."
          />
        )}

        {!isLoading && !error && groups.length === 0 && (
          <EmptyState
            icon={<History size={26} />}
            title="Chưa có gì được ghi lại"
            hint="Mọi thay đổi về giao dịch và tài khoản từ giờ sẽ hiện ở đây."
          />
        )}

        {groups.map(([day, items]) => (
          <section key={day} className="mb-4">
            <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-500">
              {formatDay(day)}
            </h2>

            <div className="card divide-y divide-ink-200/60 overflow-hidden dark:divide-white/5">
              {items.map((log) => {
                const { icon: Icon, className } = ACTION_STYLES[log.action]
                const actor = members.find((m) => m.id === log.actor_id)
                const changes = describeChanges(log.changed, names)
                // Ban ghi da bi xoa thi khong con gi de mo ra xem nua
                const canOpen = log.action !== 'delete'

                return (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => void openRecord(log)}
                    className="flex w-full gap-3 px-4 py-3 text-left transition active:bg-ink-100 dark:active:bg-white/5"
                  >
                    <span
                      className={clsx(
                        'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl',
                        className,
                      )}
                    >
                      <Icon size={17} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold">
                        {actor ? `${actor.avatar_emoji} ${actor.display_name}` : 'Không rõ ai'}
                        <span className="font-normal text-ink-500">
                          {' '}
                          {ACTION_LABELS[log.action].toLowerCase()}{' '}
                          {TABLE_LABELS[log.table_name] ?? log.table_name}
                        </span>
                      </p>

                      <p className="truncate text-[13px] text-ink-500">
                        {describeRecord(log, names) || '—'}
                        {/*
                          Ma ngan de phan biet hai khoan nhin giong het nhau.
                          Ma nay cung hien o cuoi form sua giao dich, doi chieu
                          la biet ngay dong nhat ky noi ve khoan nao.
                        */}
                        <span className="ml-1.5 font-mono text-[11px] text-ink-400">
                          #{shortId(log.record_id)}
                        </span>
                      </p>

                      {changes.length > 0 && (
                        <ul className="mt-1.5 space-y-1">
                          {changes.map((c) => (
                            <li key={c.field} className="text-[13px]">
                              <span className="text-ink-500">{c.label}: </span>
                              <span className="text-ink-400 line-through">{c.from}</span>
                              <span className="mx-1 text-ink-400">→</span>
                              <span className="font-semibold">{c.to}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <time className="text-[12px] tabular-nums text-ink-400">
                        {dayjs(log.created_at).format('HH:mm')}
                      </time>
                      {canOpen &&
                        (openingId === log.id ? (
                          <Spinner className="h-4 w-4 text-ink-400" />
                        ) : (
                          <ChevronRight size={16} className="text-ink-400" />
                        ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        ))}

        {(data?.length ?? 0) > 0 && (
          <p className="mt-2 text-center text-[12px] text-ink-400">
            Hiển thị {data?.length} thay đổi gần nhất · bấm một dòng để mở khoản đó
          </p>
        )}
      </div>

      <TransactionSheet
        open={Boolean(editing)}
        transaction={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}

function groupByDay(rows: ActivityLog[]): [string, ActivityLog[]][] {
  const map = new Map<string, ActivityLog[]>()
  for (const row of rows) {
    const day = dayjs(row.created_at).format('YYYY-MM-DD')
    const bucket = map.get(day)
    if (bucket) bucket.push(row)
    else map.set(day, [row])
  }
  return [...map.entries()]
}

function formatDay(day: string): string {
  const d = dayjs(day)
  const today = dayjs().startOf('day')
  if (d.isSame(today, 'day')) return 'Hôm nay'
  if (d.isSame(today.subtract(1, 'day'), 'day')) return 'Hôm qua'
  return d.format('dddd, DD/MM/YYYY')
}
