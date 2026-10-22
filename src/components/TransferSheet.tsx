import clsx from 'clsx'
import { ArrowDown, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useApp, useMe } from '@/hooks/useApp'
import { errorMessage } from '@/lib/errors'
import { dateKey, formatMoney } from '@/lib/format'
import { useSplitTransfer } from '@/lib/queries'
import { summariseSplit, type SplitLeg } from '@/lib/transfers'
import { AccountSelect } from './AccountSelect'
import { Field, MoneyInput, Sheet, Spinner, useToast } from './ui'

/**
 * Chuyen tien giua cac tai khoan cua nha minh, mot nguon ra mot hoac nhieu
 * noi nhan. Vd dau thang nhan 5tr vao BIDV, chia 2tr sang Momo, 2tr sang VCB.
 *
 * Ghi thanh cac khoan "Chuyển" chu khong phai cap Chi + Thu: tien chi doi cho
 * nam, khong ai tieu cung khong ai kiem them, nen tong Thu / Chi khong duoc
 * doi. Form giao dich thuong cung co tab Chuyển nhung chi mot noi nhan mot
 * lan, chia luong ra ba bon cho thi phai mo ba bon lan.
 */
export function TransferSheet({
  open,
  onClose,
  fromAccountId,
}: {
  open: boolean
  onClose: () => void
  /** Mo tu trang mot tai khoan thi dien san tai khoan do lam nguon. */
  fromAccountId?: string | null
}) {
  const me = useMe()
  const { household, accounts, accountById, balanceOf } = useApp()
  const split = useSplitTransfer()
  const toast = useToast()

  const [from, setFrom] = useState<string | null>(null)
  const [legs, setLegs] = useState<SplitLeg[]>([{ toAccountId: null, amount: 0 }])
  const [date, setDate] = useState(dateKey(new Date()))
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    setFrom(fromAccountId ?? accounts.find((a) => !a.archived)?.id ?? null)
    setLegs([{ toAccountId: null, amount: 0 }])
    setDate(dateKey(new Date()))
    setNote('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fromAccountId])

  const summary = summariseSplit(from, legs)
  const source = accountById(from)
  const remaining = from ? balanceOf(from) - summary.total : 0
  const invalid = !from || summary.valid.length === 0 || summary.hasSelfTransfer

  const updateLeg = (i: number, next: Partial<SplitLeg>) =>
    setLegs((ls) => ls.map((l, j) => (j === i ? { ...l, ...next } : l)))

  const submit = async () => {
    if (invalid || !household || !from) return
    try {
      const { pending, count } = await split.mutateAsync({
        household_id: household.id,
        created_by: me.id,
        fromAccountId: from,
        legs: summary.valid,
        occurred_at: date,
        note: note.trim(),
      })
      toast(
        pending
          ? 'Đã lưu vào máy · sẽ gửi khi có mạng'
          : count > 1
            ? `Đã ghi ${count} khoản chuyển`
            : 'Đã ghi khoản chuyển',
      )
      onClose()
    } catch (e) {
      toast(errorMessage(e, 'Lưu thất bại'), 'error')
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Chuyển tiền giữa tài khoản"
      footer={
        <button
          className="btn-primary w-full"
          disabled={invalid || split.isPending}
          onClick={() => void submit()}
        >
          {split.isPending ? <Spinner /> : null}
          {summary.valid.length > 1
            ? `Chuyển ${formatMoney(summary.total)} tới ${summary.valid.length} nơi`
            : 'Chuyển tiền'}
        </button>
      }
    >
      <p className="mb-4 rounded-2xl bg-brand-500/10 px-4 py-3 text-[13px] leading-relaxed text-brand-700 dark:text-brand-300">
        Tiền chỉ đổi chỗ nằm, <b>không tính vào Thu hay Chi</b>. Đừng ghi thành một khoản chi
        và một khoản thu — làm vậy tổng thu, tổng chi của tháng sẽ bị đội lên.
      </p>

      <Field label="Từ tài khoản">
        <AccountSelect value={from} onChange={setFrom} />
      </Field>

      <div className="mb-2 flex justify-center text-ink-400">
        <ArrowDown size={20} />
      </div>

      <div className="mb-4 space-y-3">
        {legs.map((leg, i) => {
          const self = leg.toAccountId !== null && leg.toAccountId === from
          return (
            <div key={i} className="rounded-2xl bg-ink-100 p-3 dark:bg-white/5">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[13px] font-semibold text-ink-500">
                  {legs.length > 1 ? `Nơi nhận ${i + 1}` : 'Đến tài khoản'}
                </span>
                {legs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLegs((ls) => ls.filter((_, j) => j !== i))}
                    aria-label="Bỏ nơi nhận này"
                    className="ml-auto rounded-full p-1.5 text-ink-400 transition active:scale-90"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <AccountSelect
                value={leg.toAccountId}
                onChange={(id) => updateLeg(i, { toAccountId: id })}
                exclude={[from]}
              />
              {self && (
                <p className="mt-1.5 text-xs text-red-500">Không chuyển về chính tài khoản nguồn.</p>
              )}
              <MoneyInput
                className="mt-2"
                value={leg.amount}
                onChange={(amount) => updateLeg(i, { amount })}
              />
            </div>
          )
        })}

        <button
          type="button"
          className="btn-ghost w-full py-2.5 text-sm"
          onClick={() => setLegs((ls) => [...ls, { toAccountId: null, amount: 0 }])}
        >
          <Plus size={16} /> Thêm nơi nhận
        </button>
      </div>

      {source && summary.total > 0 && (
        <div className="mb-4 space-y-1.5 rounded-2xl border border-ink-200 px-4 py-3 text-sm dark:border-white/10">
          <div className="flex justify-between gap-3">
            <span className="text-ink-500">Tổng chuyển đi</span>
            <span className="font-bold tabular-nums">{formatMoney(summary.total)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="min-w-0 truncate text-ink-500">
              {source.name} còn lại
            </span>
            <span className={clsx('shrink-0 font-bold tabular-nums', remaining < 0 && 'text-red-500')}>
              {formatMoney(remaining)}
            </span>
          </div>
        </div>
      )}

      <Field label="Ngày">
        <input
          type="date"
          className="field"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>

      <Field label="Ghi chú">
        <input
          className="field"
          placeholder="VD: Chia lương tháng 10"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
    </Sheet>
  )
}
