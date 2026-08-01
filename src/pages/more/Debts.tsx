import clsx from 'clsx'
import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SubHeader } from '@/components/AppShell'
import {
  EmptyState,
  Field,
  MoneyInput,
  ProgressBar,
  Segmented,
  Sheet,
  Spinner,
  useConfirm,
  useToast,
} from '@/components/ui'
import { useApp } from '@/hooks/useApp'
import { errorMessage } from '@/lib/errors'
import { dateKey, dayjs, formatMoney, pct } from '@/lib/format'
import { useDebts, useDeleteDebt, useSaveDebt } from '@/lib/queries'
import type { Debt } from '@/lib/types'

export default function Debts() {
  const debtsQ = useDebts(true)
  const { memberById } = useApp()
  const [editing, setEditing] = useState<Debt | null>(null)
  const [creating, setCreating] = useState(false)
  const [showSettled, setShowSettled] = useState(false)

  const debts = debtsQ.data ?? []
  const open = debts.filter((d) => !d.settled)
  const settled = debts.filter((d) => d.settled)

  const totals = useMemo(() => {
    let lend = 0
    let borrow = 0
    for (const d of open) {
      const left = Math.max(0, d.amount - d.paid_amount)
      if (d.direction === 'lend') lend += left
      else borrow += left
    }
    return { lend, borrow }
  }, [open])

  const visible = showSettled ? settled : open

  if (debtsQ.isLoading) {
    return (
      <div className="page-pad">
        <SubHeader title="Vay & cho vay" />
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-ink-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="page-pad">
      <SubHeader title="Vay & cho vay" subtitle="Theo dõi các khoản nợ của gia đình" />

      <div className="space-y-4 px-4">
        <section className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <p className="text-[12px] font-bold uppercase tracking-wide text-ink-500">
              Người ta nợ mình
            </p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatMoney(totals.lend)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-[12px] font-bold uppercase tracking-wide text-ink-500">
              Mình đang nợ
            </p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-red-500">
              {formatMoney(totals.borrow)}
            </p>
          </div>
        </section>

        <Segmented
          value={showSettled ? 'settled' : 'open'}
          onChange={(v) => setShowSettled(v === 'settled')}
          options={[
            { value: 'open', label: `Chưa xong (${open.length})` },
            { value: 'settled', label: `Đã xong (${settled.length})` },
          ]}
        />

        {visible.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="🤝"
              title={showSettled ? 'Chưa có khoản nào tất toán' : 'Không có khoản nợ nào'}
              hint={
                showSettled
                  ? undefined
                  : 'Ghi lại khi cho ai mượn tiền hoặc mình mượn của ai để không quên.'
              }
            />
          </div>
        ) : (
          visible.map((d) => {
            const left = Math.max(0, d.amount - d.paid_amount)
            const progress = pct(d.paid_amount, d.amount)
            const overdue = d.due_date && !d.settled && dayjs(d.due_date).isBefore(dayjs(), 'day')
            const who = memberById(d.profile_id)

            return (
              <button
                key={d.id}
                onClick={() => setEditing(d)}
                className={clsx('card w-full p-4 text-left', d.settled && 'opacity-60')}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={clsx(
                      'grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl',
                      d.direction === 'lend'
                        ? 'bg-emerald-500/15'
                        : 'bg-red-500/15',
                    )}
                  >
                    {d.direction === 'lend' ? '📤' : '📥'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{d.counterparty}</span>
                    <span className="block text-[13px] text-ink-500">
                      {d.direction === 'lend' ? 'Cho vay' : 'Mình vay'} ·{' '}
                      {dayjs(d.occurred_at).format('D/M/YYYY')}
                      {who ? ` · ${who.avatar_emoji}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-bold tabular-nums">{formatMoney(left)}</span>
                    {d.paid_amount > 0 && (
                      <span className="text-[12px] text-ink-500">/ {formatMoney(d.amount)}</span>
                    )}
                  </span>
                </div>

                {d.paid_amount > 0 && !d.settled && (
                  <div className="mt-3">
                    <ProgressBar value={progress} color="#1baf7a" />
                  </div>
                )}

                {(overdue || d.due_date || d.note) && (
                  <p
                    className={clsx(
                      'mt-2 text-[13px]',
                      overdue ? 'font-semibold text-red-500' : 'text-ink-500',
                    )}
                  >
                    {overdue
                      ? `⚠️ Quá hạn ${dayjs().diff(dayjs(d.due_date), 'day')} ngày`
                      : d.due_date
                        ? `Hẹn trả ${dayjs(d.due_date).format('D/M/YYYY')}`
                        : ''}
                    {d.note ? `${d.due_date || overdue ? ' · ' : ''}${d.note}` : ''}
                  </p>
                )}
              </button>
            )
          })
        )}

        <button className="btn-ghost w-full" onClick={() => setCreating(true)}>
          <Plus size={18} /> Thêm khoản nợ
        </button>
      </div>

      <DebtSheet
        open={creating || Boolean(editing)}
        debt={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />
    </div>
  )
}

function DebtSheet({
  open,
  debt,
  onClose,
}: {
  open: boolean
  debt: Debt | null
  onClose: () => void
}) {
  const { household, profile } = useApp()
  const save = useSaveDebt()
  const del = useDeleteDebt()
  const toast = useToast()
  const confirm = useConfirm()

  const [direction, setDirection] = useState<'lend' | 'borrow'>('lend')
  const [counterparty, setCounterparty] = useState('')
  const [amount, setAmount] = useState(0)
  const [paid, setPaid] = useState(0)
  const [occurredAt, setOccurredAt] = useState(dateKey(new Date()))
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [settled, setSettled] = useState(false)

  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setDirection(debt?.direction ?? 'lend')
      setCounterparty(debt?.counterparty ?? '')
      setAmount(debt?.amount ?? 0)
      setPaid(debt?.paid_amount ?? 0)
      setOccurredAt(debt?.occurred_at ?? dateKey(new Date()))
      setDueDate(debt?.due_date ?? '')
      setNote(debt?.note ?? '')
      setSettled(debt?.settled ?? false)
    }
  }

  const invalid = !counterparty.trim() || amount <= 0

  const submit = async () => {
    if (invalid || !household) return
    try {
      await save.mutateAsync({
        id: debt?.id,
        household_id: household.id,
        direction,
        counterparty: counterparty.trim(),
        amount,
        paid_amount: Math.min(paid, amount),
        occurred_at: occurredAt,
        due_date: dueDate || null,
        note: note.trim(),
        profile_id: debt?.profile_id ?? profile?.id ?? null,
        settled: settled || paid >= amount,
      })
      toast(debt ? 'Đã cập nhật' : 'Đã thêm khoản nợ')
      onClose()
    } catch (e) {
      toast(errorMessage(e, 'Lưu thất bại'), 'error')
    }
  }

  const remove = async () => {
    if (!debt) return
    const ok = await confirm({
      title: `Xoá khoản nợ với ${debt.counterparty}?`,
      confirmLabel: 'Xoá',
      danger: true,
    })
    if (!ok) return
    await del.mutateAsync(debt.id)
    toast('Đã xoá')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={debt ? 'Sửa khoản nợ' : 'Khoản nợ mới'}
      footer={
        <div className="flex gap-3">
          {debt && (
            <button className="btn btn-danger px-4" onClick={remove} aria-label="Xoá">
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn-primary flex-1" disabled={invalid || save.isPending} onClick={submit}>
            {save.isPending && <Spinner />}
            Lưu
          </button>
        </div>
      }
    >
      <Segmented
        value={direction}
        onChange={setDirection}
        className="mb-5"
        options={[
          { value: 'lend', label: '📤 Mình cho vay' },
          { value: 'borrow', label: '📥 Mình đi vay' },
        ]}
      />

      <Field label={direction === 'lend' ? 'Cho ai vay' : 'Vay của ai'}>
        <input
          className="field"
          placeholder="VD: Anh Nam"
          value={counterparty}
          onChange={(e) => setCounterparty(e.target.value)}
        />
      </Field>

      <Field label="Số tiền">
        <MoneyInput value={amount} onChange={setAmount} />
      </Field>

      <Field label="Đã trả / đã nhận lại" hint="Để 0 nếu chưa trả đồng nào">
        <MoneyInput value={paid} onChange={setPaid} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Ngày vay">
          <input
            type="date"
            className="field"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </Field>
        <Field label="Hẹn trả">
          <input
            type="date"
            className="field"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Ghi chú">
        <input
          className="field"
          placeholder="VD: mượn mua xe, trả dần mỗi tháng"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      <label className="flex items-center gap-3 rounded-2xl bg-ink-100 px-4 py-3 dark:bg-white/5">
        <input
          type="checkbox"
          checked={settled}
          onChange={(e) => setSettled(e.target.checked)}
          className="h-5 w-5 rounded accent-brand-600"
        />
        <span className="text-[15px] font-semibold">Đã tất toán xong</span>
      </label>
    </Sheet>
  )
}
