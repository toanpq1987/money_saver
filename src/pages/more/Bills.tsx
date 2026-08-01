import clsx from 'clsx'
import { Check, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SubHeader } from '@/components/AppShell'
import {
  EmptyState,
  Field,
  MoneyInput,
  Sheet,
  Spinner,
  useConfirm,
  useToast,
} from '@/components/ui'
import { useApp, useMe } from '@/hooks/useApp'
import { errorMessage } from '@/lib/errors'
import { dateKey, dayjs, formatMoney } from '@/lib/format'
import { useBills, useDeleteBill, useSaveBill, useSaveTransaction } from '@/lib/queries'
import type { RecurringBill } from '@/lib/types'

export default function Bills() {
  const billsQ = useBills(true)
  const { categoryById, accountById, household } = useApp()
  const me = useMe()
  const saveBill = useSaveBill()
  const saveTx = useSaveTransaction()
  const toast = useToast()
  const confirm = useConfirm()

  const [editing, setEditing] = useState<RecurringBill | null>(null)
  const [creating, setCreating] = useState(false)

  const bills = billsQ.data ?? []
  const monthlyTotal = bills.filter((b) => b.active).reduce((s, b) => s + b.amount, 0)

  const enriched = useMemo(() => {
    const today = dayjs()
    return bills.map((b) => {
      const dueDay = Math.min(b.day_of_month, today.daysInMonth())
      const due = today.date(dueDay)
      const paidThisMonth = Boolean(b.last_paid_on && dayjs(b.last_paid_on).isSame(today, 'month'))
      return { bill: b, due, daysLeft: due.diff(today, 'day'), paidThisMonth }
    })
  }, [bills])

  /** Ghi mot giao dich chi va danh dau hoa don da tra thang nay. */
  const markPaid = async (b: RecurringBill) => {
    if (!household) return
    const ok = await confirm({
      title: `Đã trả “${b.name}”?`,
      message: `Sẽ tạo một khoản chi ${formatMoney(b.amount)} cho hôm nay.`,
      confirmLabel: 'Ghi khoản chi',
    })
    if (!ok) return
    try {
      await saveTx.mutateAsync({
        household_id: household.id,
        type: 'expense',
        amount: b.amount,
        occurred_at: dateKey(new Date()),
        category_id: b.category_id,
        account_id: b.account_id,
        to_account_id: null,
        payer_id: me.id,
        is_shared: true,
        note: b.name,
        created_by: me.id,
      })
      await saveBill.mutateAsync({ id: b.id, last_paid_on: dateKey(new Date()) })
      toast('Đã ghi khoản chi cho hoá đơn này')
    } catch (e) {
      toast(errorMessage(e, 'Lưu thất bại'), 'error')
    }
  }

  if (billsQ.isLoading) {
    return (
      <div className="page-pad">
        <SubHeader title="Hoá đơn định kỳ" />
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-ink-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="page-pad">
      <SubHeader
        title="Hoá đơn định kỳ"
        subtitle={monthlyTotal > 0 ? `${formatMoney(monthlyTotal)} mỗi tháng` : undefined}
      />

      <div className="space-y-4 px-4">
        {bills.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="🔁"
              title="Chưa có hoá đơn định kỳ"
              hint="Thêm tiền nhà, internet, học phí… để app nhắc trước 7 ngày ở màn hình Tổng quan."
              action={
                <button className="btn-primary mt-2" onClick={() => setCreating(true)}>
                  <Plus size={18} /> Thêm hoá đơn
                </button>
              }
            />
          </div>
        ) : (
          enriched.map(({ bill: b, daysLeft, paidThisMonth }) => {
            const cat = categoryById(b.category_id)
            const acc = accountById(b.account_id)
            return (
              <section key={b.id} className={clsx('card p-4', !b.active && 'opacity-60')}>
                <button onClick={() => setEditing(b)} className="flex w-full items-center gap-3 text-left">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl"
                    style={{ background: `${cat?.color ?? '#898781'}22` }}
                  >
                    {cat?.icon ?? '🔁'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{b.name}</span>
                    <span className="block truncate text-[13px] text-ink-500">
                      Ngày {b.day_of_month} hàng tháng
                      {acc ? ` · ${acc.name}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">{formatMoney(b.amount)}</span>
                </button>

                <div className="mt-3 flex items-center gap-3">
                  <p
                    className={clsx(
                      'flex-1 text-[13px]',
                      paidThisMonth
                        ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                        : daysLeft < 0
                          ? 'font-semibold text-red-500'
                          : daysLeft <= 3
                            ? 'font-semibold text-amber-600 dark:text-amber-400'
                            : 'text-ink-500',
                    )}
                  >
                    {!b.active
                      ? 'Đang tạm dừng'
                      : paidThisMonth
                        ? '✓ Đã trả tháng này'
                        : daysLeft < 0
                          ? `Quá hạn ${-daysLeft} ngày`
                          : daysLeft === 0
                            ? 'Đến hạn hôm nay'
                            : `Còn ${daysLeft} ngày`}
                  </p>

                  {b.active && !paidThisMonth && (
                    <button
                      onClick={() => void markPaid(b)}
                      disabled={saveTx.isPending}
                      className="btn-ghost px-3 py-2 text-[13px]"
                    >
                      <Check size={15} /> Đã trả
                    </button>
                  )}
                </div>
              </section>
            )
          })
        )}

        {bills.length > 0 && (
          <button className="btn-ghost w-full" onClick={() => setCreating(true)}>
            <Plus size={18} /> Thêm hoá đơn
          </button>
        )}
      </div>

      <BillSheet
        open={creating || Boolean(editing)}
        bill={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />
    </div>
  )
}

function BillSheet({
  open,
  bill,
  onClose,
}: {
  open: boolean
  bill: RecurringBill | null
  onClose: () => void
}) {
  const { household, categories, accounts } = useApp()
  const save = useSaveBill()
  const del = useDeleteBill()
  const toast = useToast()
  const confirm = useConfirm()

  const [name, setName] = useState('')
  const [amount, setAmount] = useState(0)
  const [day, setDay] = useState('1')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [active, setActive] = useState(true)
  const [note, setNote] = useState('')

  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setName(bill?.name ?? '')
      setAmount(bill?.amount ?? 0)
      setDay(String(bill?.day_of_month ?? 1))
      setCategoryId(bill?.category_id ?? '')
      setAccountId(bill?.account_id ?? '')
      setActive(bill?.active ?? true)
      setNote(bill?.note ?? '')
    }
  }

  const dayNum = Math.min(31, Math.max(1, Number(day) || 1))
  const invalid = !name.trim() || amount <= 0

  const submit = async () => {
    if (invalid || !household) return
    try {
      await save.mutateAsync({
        id: bill?.id,
        household_id: household.id,
        name: name.trim(),
        amount,
        day_of_month: dayNum,
        category_id: categoryId || null,
        account_id: accountId || null,
        active,
        note: note.trim(),
      })
      toast(bill ? 'Đã cập nhật hoá đơn' : 'Đã thêm hoá đơn')
      onClose()
    } catch (e) {
      toast(errorMessage(e, 'Lưu thất bại'), 'error')
    }
  }

  const remove = async () => {
    if (!bill) return
    const ok = await confirm({ title: `Xoá “${bill.name}”?`, confirmLabel: 'Xoá', danger: true })
    if (!ok) return
    await del.mutateAsync(bill.id)
    toast('Đã xoá hoá đơn')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={bill ? 'Sửa hoá đơn' : 'Hoá đơn định kỳ mới'}
      footer={
        <div className="flex gap-3">
          {bill && (
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
      <Field label="Tên hoá đơn">
        <input
          className="field"
          placeholder="VD: Tiền thuê nhà"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Số tiền">
        <MoneyInput value={amount} onChange={setAmount} />
      </Field>

      <Field label="Ngày trả hàng tháng" hint="Nếu tháng không có ngày này, app sẽ lấy ngày cuối tháng">
        <input
          inputMode="numeric"
          className="field"
          value={day}
          onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
        />
      </Field>

      <Field label="Danh mục">
        <select className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">— Không chọn —</option>
          {categories
            .filter((c) => c.kind === 'expense' && !c.archived)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
        </select>
      </Field>

      <Field label="Trả từ ví">
        <select className="field" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">— Không chọn —</option>
          {accounts
            .filter((a) => !a.archived)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon} {a.name}
              </option>
            ))}
        </select>
      </Field>

      <Field label="Ghi chú">
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <label className="flex items-center gap-3 rounded-2xl bg-ink-100 px-4 py-3 dark:bg-white/5">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-5 w-5 rounded accent-brand-600"
        />
        <span className="text-[15px] font-semibold">Đang áp dụng</span>
      </label>
    </Sheet>
  )
}
