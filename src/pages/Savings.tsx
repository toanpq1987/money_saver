import clsx from 'clsx'
import { Building2, Minus, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/AppShell'
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
import { useApp, useMe } from '@/hooks/useApp'
import { errorMessage } from '@/lib/errors'
import { dateKey, dayjs, formatCompact, formatMoney, pct } from '@/lib/format'
import { INTEREST_LABELS, depositMath, monthlyNeeded } from '@/lib/finance'
import {
  useDeleteDeposit,
  useDeleteGoal,
  useDeposits,
  useGoals,
  useSaveDeposit,
  useSaveGoal,
  useSaveSavingsEntry,
  useSavingsEntries,
} from '@/lib/queries'
import type { Deposit, InterestType, SavingsGoal } from '@/lib/types'

export default function Savings() {
  const [tab, setTab] = useState<'goals' | 'deposits'>('goals')

  return (
    <div className="page-pad">
      <PageHeader title="Tiết kiệm" subtitle="Quỹ mục tiêu và sổ ngân hàng của cả nhà" />
      <div className="px-4 pb-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'goals', label: '🎯 Quỹ mục tiêu' },
            { value: 'deposits', label: '🏦 Sổ tiết kiệm' },
          ]}
        />
      </div>
      {tab === 'goals' ? <GoalsTab /> : <DepositsTab />}
    </div>
  )
}

// ===========================================================================
// Quy muc tieu
// ===========================================================================

function GoalsTab() {
  const goalsQ = useGoals(true)
  const entriesQ = useSavingsEntries(true)
  const [editing, setEditing] = useState<SavingsGoal | null>(null)
  const [creating, setCreating] = useState(false)
  const [depositing, setDepositing] = useState<{ goal: SavingsGoal; direction: 'in' | 'out' } | null>(
    null,
  )

  const savedByGoal = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entriesQ.data ?? []) {
      map.set(e.goal_id, (map.get(e.goal_id) ?? 0) + (e.direction === 'in' ? e.amount : -e.amount))
    }
    return map
  }, [entriesQ.data])

  const goals = goalsQ.data ?? []
  const totalSaved = [...savedByGoal.values()].reduce((s, v) => s + v, 0)

  if (goalsQ.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-ink-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4">
      {goals.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 text-white shadow-xl shadow-emerald-600/20">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-white/70">
            Tổng đã tích luỹ
          </p>
          <p className="mt-1 text-[32px] font-extrabold tabular-nums">{formatMoney(totalSaved)}</p>
          <p className="mt-1 text-[13px] text-white/70">{goals.length} mục tiêu đang theo dõi</p>
        </section>
      )}

      {goals.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🎯"
            title="Chưa có mục tiêu nào"
            hint="Đặt mục tiêu như “Mua nhà”, “Du lịch Đà Lạt”, “Quỹ dự phòng 6 tháng” để cùng nhau theo dõi."
            action={
              <button className="btn-primary mt-2" onClick={() => setCreating(true)}>
                <Plus size={18} /> Tạo mục tiêu
              </button>
            }
          />
        </div>
      ) : (
        <>
          {goals.map((g) => {
            const saved = savedByGoal.get(g.id) ?? 0
            const progress = pct(saved, g.target_amount)
            const remaining = Math.max(0, g.target_amount - saved)
            const perMonth = monthlyNeeded(remaining, g.deadline)
            const done = saved >= g.target_amount

            return (
              <section key={g.id} className="card p-4">
                <button onClick={() => setEditing(g)} className="flex w-full items-center gap-3 text-left">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl"
                    style={{ background: `${g.color}22` }}
                  >
                    {g.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{g.name}</span>
                    <span className="text-[13px] text-ink-500">
                      {g.deadline ? `Hạn ${dayjs(g.deadline).format('D/M/YYYY')}` : 'Không đặt hạn'}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={clsx('block font-bold tabular-nums', done && 'text-emerald-600')}>
                      {progress}%
                    </span>
                  </span>
                </button>

                <div className="mt-3">
                  <ProgressBar value={progress} color={done ? '#008300' : g.color} />
                </div>

                <p className="mt-2 text-[13px] text-ink-500">
                  <b className="text-ink-950 dark:text-ink-100">{formatMoney(saved)}</b> /{' '}
                  {formatMoney(g.target_amount)}
                  {done ? ' — đã đạt mục tiêu 🎉' : ` · còn thiếu ${formatCompact(remaining)}`}
                </p>
                {perMonth && !done && (
                  <p className="mt-1 text-[13px] text-ink-500">
                    Cần gửi ~<b>{formatCompact(perMonth)}</b>/tháng để kịp hạn
                  </p>
                )}
                {g.note && <p className="mt-2 text-[13px] text-ink-500">{g.note}</p>}

                <div className="mt-3 flex gap-2">
                  <button
                    className="btn-ghost flex-1 py-2.5 text-sm"
                    onClick={() => setDepositing({ goal: g, direction: 'in' })}
                  >
                    <Plus size={16} /> Gửi thêm
                  </button>
                  <button
                    className="btn-ghost flex-1 py-2.5 text-sm"
                    onClick={() => setDepositing({ goal: g, direction: 'out' })}
                  >
                    <Minus size={16} /> Rút ra
                  </button>
                </div>
              </section>
            )
          })}

          <button className="btn-ghost w-full" onClick={() => setCreating(true)}>
            <Plus size={18} /> Thêm mục tiêu mới
          </button>
        </>
      )}

      <GoalSheet
        open={creating || Boolean(editing)}
        goal={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />
      <EntrySheet data={depositing} onClose={() => setDepositing(null)} />
    </div>
  )
}

const GOAL_ICONS = ['🎯', '🏠', '🚗', '✈️', '💍', '🎓', '🛡️', '👶', '💻', '🏖️']

function GoalSheet({
  open,
  goal,
  onClose,
}: {
  open: boolean
  goal: SavingsGoal | null
  onClose: () => void
}) {
  const { household } = useApp()
  const save = useSaveGoal()
  const del = useDeleteGoal()
  const toast = useToast()
  const confirm = useConfirm()

  const [name, setName] = useState('')
  const [target, setTarget] = useState(0)
  const [deadline, setDeadline] = useState('')
  const [icon, setIcon] = useState('🎯')
  const [note, setNote] = useState('')

  const reset = () => {
    setName(goal?.name ?? '')
    setTarget(goal?.target_amount ?? 0)
    setDeadline(goal?.deadline ?? '')
    setIcon(goal?.icon ?? '🎯')
    setNote(goal?.note ?? '')
  }

  // Nap gia tri khi sheet vua mo
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) reset()
  }

  const submit = async () => {
    if (!household || !name.trim() || target <= 0) return
    try {
      await save.mutateAsync({
        id: goal?.id,
        household_id: household.id,
        name: name.trim(),
        target_amount: target,
        deadline: deadline || null,
        icon,
        color: '#008300',
        note: note.trim(),
      })
      toast(goal ? 'Đã cập nhật mục tiêu' : 'Đã tạo mục tiêu 🎯')
      onClose()
    } catch (e) {
      toast(errorMessage(e, 'Lưu thất bại'), 'error')
    }
  }

  const remove = async () => {
    if (!goal) return
    const ok = await confirm({
      title: `Xoá “${goal.name}”?`,
      message: 'Toàn bộ lịch sử gửi/rút của mục tiêu này cũng sẽ bị xoá.',
      confirmLabel: 'Xoá',
      danger: true,
    })
    if (!ok) return
    await del.mutateAsync(goal.id)
    toast('Đã xoá mục tiêu')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={goal ? 'Sửa mục tiêu' : 'Mục tiêu mới'}
      footer={
        <div className="flex gap-3">
          {goal && (
            <button className="btn btn-danger px-4" onClick={remove} aria-label="Xoá">
              <Trash2 size={18} />
            </button>
          )}
          <button
            className="btn-primary flex-1"
            disabled={!name.trim() || target <= 0 || save.isPending}
            onClick={submit}
          >
            {save.isPending && <Spinner />}
            Lưu
          </button>
        </div>
      }
    >
      <Field label="Tên mục tiêu">
        <input
          className="field"
          placeholder="VD: Mua nhà, Du lịch Nhật Bản"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Số tiền cần đạt">
        <MoneyInput value={target} onChange={setTarget} />
      </Field>

      <Field label="Biểu tượng">
        <div className="flex flex-wrap gap-2">
          {GOAL_ICONS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIcon(i)}
              className={clsx(
                'grid h-11 w-11 place-items-center rounded-2xl text-xl transition active:scale-90',
                icon === i ? 'bg-brand-600 shadow-md' : 'bg-ink-100 dark:bg-white/5',
              )}
            >
              {i}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Hạn hoàn thành" hint="Để trống nếu không đặt hạn">
        <input
          type="date"
          className="field"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </Field>

      <Field label="Ghi chú">
        <input
          className="field"
          placeholder="VD: gửi mỗi tháng sau khi nhận lương"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
    </Sheet>
  )
}

function EntrySheet({
  data,
  onClose,
}: {
  data: { goal: SavingsGoal; direction: 'in' | 'out' } | null
  onClose: () => void
}) {
  const me = useMe()
  const { household } = useApp()
  const save = useSaveSavingsEntry()
  const toast = useToast()

  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(dateKey(new Date()))
  const [note, setNote] = useState('')

  const [wasOpen, setWasOpen] = useState(false)
  const open = Boolean(data)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setAmount(0)
      setDate(dateKey(new Date()))
      setNote('')
    }
  }

  const submit = async () => {
    if (!data || !household || amount <= 0) return
    try {
      await save.mutateAsync({
        household_id: household.id,
        goal_id: data.goal.id,
        amount,
        direction: data.direction,
        occurred_at: date,
        note: note.trim(),
        profile_id: me.id,
      })
      toast(data.direction === 'in' ? 'Đã ghi nhận tiền gửi' : 'Đã ghi nhận rút tiền')
      onClose()
    } catch (e) {
      toast(errorMessage(e, 'Lưu thất bại'), 'error')
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={data ? `${data.direction === 'in' ? 'Gửi vào' : 'Rút khỏi'} ${data.goal.name}` : ''}
      footer={
        <button
          className="btn-primary w-full"
          disabled={amount <= 0 || save.isPending}
          onClick={submit}
        >
          {save.isPending && <Spinner />}
          Lưu
        </button>
      }
    >
      <Field label="Số tiền">
        <MoneyInput value={amount} onChange={setAmount} autoFocus />
      </Field>
      <Field label="Ngày">
        <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Ghi chú">
        <input
          className="field"
          placeholder="VD: trích từ lương tháng 8"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
    </Sheet>
  )
}

// ===========================================================================
// So tiet kiem ngan hang
// ===========================================================================

function DepositsTab() {
  const depositsQ = useDeposits(true)
  const { memberById } = useApp()
  const [editing, setEditing] = useState<Deposit | null>(null)
  const [creating, setCreating] = useState(false)

  const deposits = depositsQ.data ?? []
  const active = deposits.filter((d) => d.status === 'active')

  const totals = useMemo(() => {
    let principal = 0
    let interest = 0
    for (const d of active) {
      principal += d.principal
      interest += depositMath(d).totalInterest
    }
    return { principal, interest }
  }, [active])

  if (depositsQ.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-ink-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4">
      {active.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-xl shadow-brand-600/20">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-white/70">
            Tổng gốc đang gửi
          </p>
          <p className="mt-1 text-[32px] font-extrabold tabular-nums">
            {formatMoney(totals.principal)}
          </p>
          <p className="mt-1 text-[13px] text-white/70">
            Lãi dự kiến cả kỳ: <b className="text-emerald-300">{formatMoney(totals.interest)}</b>
          </p>
        </section>
      )}

      {deposits.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🏦"
            title="Chưa có sổ tiết kiệm nào"
            hint="Ghi lại các sổ tiết kiệm ngân hàng để theo dõi ngày đáo hạn và tiền lãi dự kiến."
            action={
              <button className="btn-primary mt-2" onClick={() => setCreating(true)}>
                <Plus size={18} /> Thêm sổ tiết kiệm
              </button>
            }
          />
        </div>
      ) : (
        <>
          {deposits.map((d) => {
            const m = depositMath(d)
            const closed = d.status === 'closed'
            const owner = memberById(d.owner_id)
            return (
              <button
                key={d.id}
                onClick={() => setEditing(d)}
                className={clsx('card w-full p-4 text-left', closed && 'opacity-60')}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-600/15 text-brand-600 dark:text-brand-400">
                    <Building2 size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{d.bank_name}</p>
                    <p className="text-[13px] text-ink-500">
                      {d.term_months} tháng · {d.interest_rate}%/năm
                      {owner ? ` · ${owner.avatar_emoji} ${owner.display_name}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 font-bold tabular-nums">{formatCompact(d.principal)}</p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
                  <div className="rounded-xl bg-ink-100 p-2.5 dark:bg-white/5">
                    <p className="text-ink-500">Lãi cả kỳ</p>
                    <p className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{formatCompact(m.totalInterest)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-ink-100 p-2.5 dark:bg-white/5">
                    <p className="text-ink-500">Đáo hạn</p>
                    <p className="font-bold tabular-nums">
                      {dayjs(m.maturityDate).format('D/M/YYYY')}
                    </p>
                  </div>
                </div>

                <p className="mt-2 text-[13px] text-ink-500">
                  {closed
                    ? 'Đã tất toán'
                    : m.matured
                      ? '⚠️ Đã đến hạn — nhớ tất toán hoặc tái tục'
                      : `Còn ${m.daysLeft} ngày · ${INTEREST_LABELS[d.interest_type]}`}
                </p>
                {!closed && !m.matured && (
                  <p className="mt-1 text-[13px] text-ink-500">
                    Lãi đã tích luỹ ước tính: <b>{formatCompact(m.accruedInterest)}</b>
                  </p>
                )}
              </button>
            )
          })}

          <button className="btn-ghost w-full" onClick={() => setCreating(true)}>
            <Plus size={18} /> Thêm sổ tiết kiệm
          </button>
        </>
      )}

      <DepositSheet
        open={creating || Boolean(editing)}
        deposit={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />
    </div>
  )
}

function DepositSheet({
  open,
  deposit,
  onClose,
}: {
  open: boolean
  deposit: Deposit | null
  onClose: () => void
}) {
  const { household, members } = useApp()
  const save = useSaveDeposit()
  const del = useDeleteDeposit()
  const toast = useToast()
  const confirm = useConfirm()

  const [bank, setBank] = useState('')
  const [principal, setPrincipal] = useState(0)
  const [rate, setRate] = useState('5.5')
  const [term, setTerm] = useState('6')
  const [openedAt, setOpenedAt] = useState(dateKey(new Date()))
  const [interestType, setInterestType] = useState<InterestType>('end')
  const [ownerId, setOwnerId] = useState<string>('')
  const [note, setNote] = useState('')
  const [closed, setClosed] = useState(false)

  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setBank(deposit?.bank_name ?? '')
      setPrincipal(deposit?.principal ?? 0)
      setRate(String(deposit?.interest_rate ?? 5.5))
      setTerm(String(deposit?.term_months ?? 6))
      setOpenedAt(deposit?.opened_at ?? dateKey(new Date()))
      setInterestType(deposit?.interest_type ?? 'end')
      setOwnerId(deposit?.owner_id ?? '')
      setNote(deposit?.note ?? '')
      setClosed(deposit?.status === 'closed')
    }
  }

  const termNum = Number(term) || 0
  const rateNum = Number(rate.replace(',', '.')) || 0
  const invalid = !bank.trim() || principal <= 0 || termNum <= 0

  const preview = useMemo(
    () =>
      invalid
        ? null
        : depositMath({
            principal,
            interest_rate: rateNum,
            term_months: termNum,
            opened_at: openedAt,
            interest_type: interestType,
          }),
    [invalid, principal, rateNum, termNum, openedAt, interestType],
  )

  const submit = async () => {
    if (invalid || !household) return
    try {
      await save.mutateAsync({
        id: deposit?.id,
        household_id: household.id,
        bank_name: bank.trim(),
        principal,
        interest_rate: rateNum,
        term_months: termNum,
        opened_at: openedAt,
        interest_type: interestType,
        owner_id: ownerId || null,
        note: note.trim(),
        status: closed ? 'closed' : 'active',
      })
      toast(deposit ? 'Đã cập nhật sổ tiết kiệm' : 'Đã thêm sổ tiết kiệm 🏦')
      onClose()
    } catch (e) {
      toast(errorMessage(e, 'Lưu thất bại'), 'error')
    }
  }

  const remove = async () => {
    if (!deposit) return
    const ok = await confirm({
      title: `Xoá sổ ${deposit.bank_name}?`,
      confirmLabel: 'Xoá',
      danger: true,
    })
    if (!ok) return
    await del.mutateAsync(deposit.id)
    toast('Đã xoá sổ tiết kiệm')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={deposit ? 'Sửa sổ tiết kiệm' : 'Sổ tiết kiệm mới'}
      footer={
        <div className="flex gap-3">
          {deposit && (
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
      <Field label="Ngân hàng">
        <input
          className="field"
          placeholder="VD: Vietcombank"
          value={bank}
          onChange={(e) => setBank(e.target.value)}
        />
      </Field>

      <Field label="Số tiền gốc">
        <MoneyInput value={principal} onChange={setPrincipal} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Lãi suất (%/năm)">
          <input
            inputMode="decimal"
            className="field"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </Field>
        <Field label="Kỳ hạn (tháng)">
          <input
            inputMode="numeric"
            className="field"
            value={term}
            onChange={(e) => setTerm(e.target.value.replace(/\D/g, ''))}
          />
        </Field>
      </div>

      <Field label="Ngày gửi">
        <input
          type="date"
          className="field"
          value={openedAt}
          onChange={(e) => setOpenedAt(e.target.value)}
        />
      </Field>

      <Field label="Hình thức trả lãi">
        <select
          className="field"
          value={interestType}
          onChange={(e) => setInterestType(e.target.value as InterestType)}
        >
          {(Object.keys(INTEREST_LABELS) as InterestType[]).map((k) => (
            <option key={k} value={k}>
              {INTEREST_LABELS[k]}
            </option>
          ))}
        </select>
      </Field>

      {members.length > 1 && (
        <Field label="Đứng tên">
          <select className="field" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">Chung của gia đình</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.avatar_emoji} {m.display_name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Ghi chú">
        <input
          className="field"
          placeholder="VD: sổ online, tự động tái tục"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      {deposit && (
        <label className="mb-4 flex items-center gap-3 rounded-2xl bg-ink-100 px-4 py-3 dark:bg-white/5">
          <input
            type="checkbox"
            checked={closed}
            onChange={(e) => setClosed(e.target.checked)}
            className="h-5 w-5 rounded accent-brand-600"
          />
          <span className="text-[15px] font-semibold">Đã tất toán sổ này</span>
        </label>
      )}

      {preview && (
        <div className="rounded-2xl bg-emerald-500/10 p-4 text-[14px]">
          <p className="font-bold text-emerald-700 dark:text-emerald-400">Dự kiến khi đáo hạn</p>
          <p className="mt-1.5 flex justify-between">
            <span className="text-ink-500">Ngày đáo hạn</span>
            <b className="tabular-nums">{dayjs(preview.maturityDate).format('D/M/YYYY')}</b>
          </p>
          <p className="mt-1 flex justify-between">
            <span className="text-ink-500">Tiền lãi</span>
            <b className="tabular-nums text-emerald-600 dark:text-emerald-400">
              +{formatMoney(preview.totalInterest)}
            </b>
          </p>
          <p className="mt-1 flex justify-between">
            <span className="text-ink-500">Tổng nhận</span>
            <b className="tabular-nums">{formatMoney(preview.maturityValue)}</b>
          </p>
          {interestType === 'monthly' && (
            <p className="mt-1 flex justify-between">
              <span className="text-ink-500">Lãi mỗi tháng</span>
              <b className="tabular-nums">{formatMoney(preview.monthlyInterest)}</b>
            </p>
          )}
        </div>
      )}
    </Sheet>
  )
}
