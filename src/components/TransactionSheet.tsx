import clsx from 'clsx'
import { ArrowRightLeft, Plus, Trash2, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useApp, useMe } from '@/hooks/useApp'
import { useActivityNames } from '@/hooks/useActivityNames'
import { describeChanges, shortId } from '@/lib/activity'
import { errorMessage, isConflict, type ConflictError } from '@/lib/errors'
import { dateKey, dayjs } from '@/lib/format'
import { diffRecords } from '@/lib/patch'
import { useDeleteTransaction, useSaveTransaction } from '@/lib/queries'
import { groupAccountsByOwner } from '@/lib/wallets'
import type { Transaction, TxType } from '@/lib/types'
import { AccountSheet } from './AccountSheet'
import { CategorySheet } from './CategorySheet'

/** Gia tri gia trong <select> de mo o tao vi moi. */
const NEW_ACCOUNT = '__new_account__'
import { Field, MoneyInput, QuickAmounts, Segmented, Sheet, Spinner, useConfirm, useToast } from './ui'

interface Props {
  open: boolean
  onClose: () => void
  /** Co gia tri = dang sua; bo trong = them moi. */
  transaction?: Transaction | null
  defaultType?: TxType
}

export function TransactionSheet({ open, onClose, transaction, defaultType = 'expense' }: Props) {
  const me = useMe()
  const { categories, accounts, members, household } = useApp()
  const save = useSaveTransaction()
  const remove = useDeleteTransaction()
  const toast = useToast()
  const confirm = useConfirm()

  const [type, setType] = useState<TxType>(defaultType)
  const [amount, setAmount] = useState(0)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [toAccountId, setToAccountId] = useState<string | null>(null)
  const [payerId, setPayerId] = useState(me.id)
  const [isShared, setIsShared] = useState(true)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(dateKey(new Date()))
  /** Dang mo o tao vi moi cho o nao: 'from' = Ví/Từ ví, 'to' = Đến ví. */
  const [addingAccount, setAddingAccount] = useState<'from' | 'to' | null>(null)
  const [addingCategory, setAddingCategory] = useState(false)
  /**
   * Ban ghi doc duoc luc mo form. Luc Luu se so voi no de biet nguoi dung
   * that su doi o nao, va de phat hien nguoi kia co vua sua cung o hay khong.
   */
  const [baseline, setBaseline] = useState<Transaction | null>(null)
  const names = useActivityNames()

  const activeAccounts = useMemo(() => accounts.filter((a) => !a.archived), [accounts])

  // Tai khoan duoc gom theo vi (Ví của tôi / Ví của vợ / Ví chung) cho de chon
  const walletGroups = useMemo(
    () => groupAccountsByOwner(accounts, members, me.id),
    [accounts, members, me.id],
  )

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (c) => !c.archived && c.kind === (type === 'income' ? 'income' : 'expense'),
      ),
    [categories, type],
  )

  /** Do noi dung mot giao dich vao form va ghi nho no lam moc so sanh. */
  const fillFrom = (tx: Transaction) => {
    setType(tx.type)
    setAmount(tx.amount)
    setCategoryId(tx.category_id)
    setAccountId(tx.account_id)
    setToAccountId(tx.to_account_id)
    setPayerId(tx.payer_id)
    setIsShared(tx.is_shared)
    setNote(tx.note)
    setDate(tx.occurred_at)
    setBaseline(tx)
  }

  // Nap lai form moi lan mo sheet
  useEffect(() => {
    if (!open) return
    if (transaction) {
      fillFrom(transaction)
    } else {
      setType(defaultType)
      setAmount(0)
      setCategoryId(null)
      setAccountId(activeAccounts[0]?.id ?? null)
      setToAccountId(null)
      setPayerId(me.id)
      setIsShared(true)
      setNote('')
      setDate(dateKey(new Date()))
      setBaseline(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction?.id])

  // Doi loai giao dich thi danh muc cu co the khong con hop le
  useEffect(() => {
    if (type === 'transfer') {
      setCategoryId(null)
      return
    }
    if (categoryId && !visibleCategories.some((c) => c.id === categoryId)) setCategoryId(null)
  }, [type, categoryId, visibleCategories])

  const invalid =
    amount <= 0 ||
    !accountId ||
    (type !== 'transfer' && !categoryId) ||
    (type === 'transfer' && (!toAccountId || toAccountId === accountId))

  /** Noi dung form hien tai, dung chung cho ca luu thuong lan luu de. */
  const formValues = () => ({
    household_id: household!.id,
    type,
    amount,
    occurred_at: date,
    category_id: type === 'transfer' ? null : categoryId,
    account_id: accountId,
    to_account_id: type === 'transfer' ? toAccountId : null,
    payer_id: payerId,
    is_shared: type === 'transfer' ? true : isShared,
    note: note.trim(),
    created_by: me.id,
  })

  const submit = async (opts: { force?: boolean; asNew?: boolean } = {}) => {
    if (invalid || !household) return
    try {
      const { pending, unchanged } = await save.mutateAsync({
        ...formValues(),
        id: opts.asNew ? undefined : transaction?.id,
        baseline: opts.asNew ? null : baseline,
        force: opts.force,
      })

      if (unchanged) {
        toast('Không có gì thay đổi')
      } else {
        toast(
          pending
            ? 'Đã lưu vào máy · sẽ gửi khi có mạng'
            : transaction && !opts.asNew
              ? 'Đã cập nhật giao dịch'
              : 'Đã lưu giao dịch',
        )
      }
      onClose()
    } catch (e) {
      if (isConflict(e)) {
        await resolveConflict(e)
        return
      }
      toast(errorMessage(e, 'Lưu thất bại'), 'error')
    }
  }

  /**
   * Nguoi kia vua dung vao dung o minh sap ghi. Khong tu quyet ho: bay ra ho
   * da doi gi roi de nguoi dung chon, vi chi ho moi biet con so nao moi dung.
   */
  const resolveConflict = async (e: ConflictError) => {
    if (e.deleted) {
      const again = await confirm({
        title: 'Khoản này vừa bị xoá',
        message: 'Người kia đã xoá khoản này trên máy của họ. Ghi lại thành một khoản mới nhé?',
        confirmLabel: 'Ghi thành khoản mới',
        cancelLabel: 'Bỏ qua',
      })
      if (again) await submit({ asNew: true })
      else onClose()
      return
    }

    const current = (e.current as Transaction | null) ?? null
    const lines = describeChanges(
      diffRecords(baseline as unknown as Record<string, unknown>, current as unknown as Record<string, unknown>),
      names,
    )

    const overwrite = await confirm({
      title: 'Người kia vừa sửa khoản này',
      message: (
        <div className="space-y-3">
          {lines.length > 0 && (
            <ul className="space-y-1.5">
              {lines.map((l) => (
                <li key={l.field} className="text-sm">
                  <span className="font-semibold">{l.label}: </span>
                  <span className="text-ink-500 line-through">{l.from}</span>
                  <span className="mx-1.5">→</span>
                  <span className="font-semibold">{l.to}</span>
                </li>
              ))}
            </ul>
          )}
          <p>Lấy bản của họ thì thay đổi bạn vừa gõ sẽ bị bỏ.</p>
        </div>
      ),
      confirmLabel: 'Vẫn lưu đè',
      cancelLabel: 'Lấy bản của họ',
      danger: true,
    })

    if (overwrite) await submit({ force: true })
    else if (current) fillFrom(current)
    else onClose()
  }

  const del = async () => {
    if (!transaction) return
    const ok = await confirm({
      title: 'Xoá giao dịch?',
      message: 'Giao dịch này sẽ bị xoá khỏi sổ của cả nhà.',
      confirmLabel: 'Xoá',
      danger: true,
    })
    if (!ok) return
    try {
      await remove.mutateAsync(transaction.id)
      toast('Đã xoá giao dịch')
      onClose()
    } catch (e) {
      toast(errorMessage(e, 'Xoá thất bại'), 'error')
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={transaction ? 'Sửa giao dịch' : 'Thêm giao dịch'}
      footer={
        <div className="flex gap-3">
          {transaction && (
            <button className="btn btn-danger px-4" onClick={del} aria-label="Xoá">
              <Trash2 size={18} />
            </button>
          )}
          <button
            className="btn-primary flex-1"
            disabled={invalid || save.isPending}
            onClick={() => void submit()}
          >
            {save.isPending ? <Spinner /> : null}
            {transaction ? 'Lưu thay đổi' : 'Thêm giao dịch'}
          </button>
        </div>
      }
    >
      <Segmented
        value={type}
        onChange={setType}
        className="mb-5"
        options={[
          { value: 'expense', label: 'Chi', activeClass: 'bg-red-500 text-white shadow-sm' },
          { value: 'income', label: 'Thu', activeClass: 'bg-emerald-500 text-white shadow-sm' },
          { value: 'transfer', label: 'Chuyển', activeClass: 'bg-brand-600 text-white shadow-sm' },
        ]}
      />

      {type === 'transfer' && (
        <p className="-mt-3 mb-4 text-[13px] leading-relaxed text-ink-500">
          Tiền đổi chỗ giữa các tài khoản của nhà mình — không tính vào Thu hay Chi. Muốn chia
          một khoản ra nhiều tài khoản cùng lúc thì vào <b>Ví &amp; tài khoản → Chuyển tiền</b>.
        </p>
      )}

      <Field label="Số tiền" hint="Gõ tắt được: 50k, 1,2tr, 2ty">
        <MoneyInput value={amount} onChange={setAmount} autoFocus={!transaction} />
        <QuickAmounts onPick={(d) => setAmount((a) => a + d)} />
      </Field>

      {type !== 'transfer' && (
        <Field label="Danh mục">
          <div className="grid grid-cols-4 gap-2">
            {visibleCategories.map((c) => {
              const active = c.id === categoryId
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={clsx(
                    'flex flex-col items-center gap-1 rounded-2xl px-1 py-3 transition active:scale-95',
                    active
                      ? 'text-white shadow-md'
                      : 'bg-ink-100 text-ink-600 dark:bg-white/5 dark:text-ink-300',
                  )}
                  style={active ? { background: c.color } : undefined}
                >
                  <span className="text-xl leading-none">{c.icon}</span>
                  <span className="line-clamp-2 text-center text-[11px] font-semibold leading-tight">
                    {c.name}
                  </span>
                </button>
              )
            })}

            {/* Tao danh muc moi ngay tai day, khong phai thoat ra trang Danh mục */}
            <button
              type="button"
              onClick={() => setAddingCategory(true)}
              className="flex flex-col items-center gap-1 rounded-2xl border-2 border-dashed
                         border-ink-300 px-1 py-3 text-ink-500 transition active:scale-95
                         dark:border-white/15 dark:text-ink-400"
            >
              <Plus size={20} strokeWidth={2.5} />
              <span className="text-center text-[11px] font-semibold leading-tight">Thêm</span>
            </button>
          </div>
        </Field>
      )}

      <Field label={type === 'transfer' ? 'Từ ví' : 'Ví / tài khoản'}>
        <select
          className="field"
          value={accountId ?? ''}
          onChange={(e) => {
            if (e.target.value === NEW_ACCOUNT) setAddingAccount('from')
            else setAccountId(e.target.value || null)
          }}
        >
          <option value="">— Chọn tài khoản —</option>
          {walletGroups.map((g) => (
            <optgroup key={g.key} label={`${g.emoji} ${g.name}`}>
              {g.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.icon} {a.name}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={NEW_ACCOUNT}>➕ Thêm tài khoản mới…</option>
        </select>
      </Field>

      {type === 'transfer' && (
        <Field label="Đến ví">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={18} className="shrink-0 text-ink-400" />
            <select
              className="field"
              value={toAccountId ?? ''}
              onChange={(e) => {
                if (e.target.value === NEW_ACCOUNT) setAddingAccount('to')
                else setToAccountId(e.target.value || null)
              }}
            >
              <option value="">— Chọn tài khoản —</option>
              {walletGroups.map((g) => {
                const options = g.accounts.filter((a) => a.id !== accountId)
                if (options.length === 0) return null
                return (
                  <optgroup key={g.key} label={`${g.emoji} ${g.name}`}>
                    {options.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.icon} {a.name}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
              <option value={NEW_ACCOUNT}>➕ Thêm tài khoản mới…</option>
            </select>
          </div>
        </Field>
      )}

      <Field label="Ngày">
        <input
          type="date"
          className="field"
          value={date}
          max={dateKey(dayjs().add(1, 'year'))}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>

      {type !== 'transfer' && members.length > 1 && (
        <Field label={type === 'income' ? 'Ai nhận' : 'Ai chi'}>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const active = m.id === payerId
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPayerId(m.id)}
                  className={clsx(
                    'chip',
                    active
                      ? 'text-white shadow-md'
                      : 'bg-ink-100 text-ink-600 dark:bg-white/5 dark:text-ink-300',
                  )}
                  style={active ? { background: m.color } : undefined}
                >
                  <span>{m.avatar_emoji}</span>
                  {m.display_name}
                </button>
              )
            })}
          </div>
        </Field>
      )}

      {type !== 'transfer' && (
        <button
          type="button"
          onClick={() => setIsShared((v) => !v)}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-ink-100 px-4 py-3 text-left transition active:scale-[.98] dark:bg-white/5"
        >
          <Users size={20} className="text-ink-400" />
          <div className="flex-1">
            <p className="text-[15px] font-semibold">
              {isShared ? 'Khoản chung của gia đình' : 'Khoản riêng cá nhân'}
            </p>
            <p className="text-xs text-ink-500">
              {isShared
                ? 'Được tính vào ngân sách và cân đối chung'
                : 'Chỉ hiện trong tab cá nhân, không chia đôi'}
            </p>
          </div>
          <span
            className={clsx(
              'relative h-7 w-12 shrink-0 rounded-full transition',
              isShared ? 'bg-brand-600' : 'bg-ink-300 dark:bg-white/15',
            )}
          >
            <span
              className={clsx(
                'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all',
                isShared ? 'left-6' : 'left-1',
              )}
            />
          </span>
        </button>
      )}

      <Field label="Ghi chú">
        <input
          className="field"
          placeholder="VD: Ăn trưa cùng gia đình"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      {/*
        Ma ngan trung voi ma hien o trang Nhat ky. Hai khoan cung ghi chu cung
        so tien thi day la thu duy nhat phan biet duoc chung.
      */}
      {transaction && (
        <p className="-mt-1 mb-2 text-center text-[12px] text-ink-400">
          Mã khoản này: <span className="font-mono">#{shortId(transaction.id)}</span>
        </p>
      )}

      {/* Tao vi moi ngay tai day, khong phai thoat ra trang Ví & tài khoản */}
      <AccountSheet
        open={addingAccount !== null}
        account={null}
        onClose={() => setAddingAccount(null)}
        onCreated={(id) => {
          if (addingAccount === 'to') setToAccountId(id)
          else setAccountId(id)
        }}
      />

      <CategorySheet
        open={addingCategory}
        category={null}
        kind={type === 'income' ? 'income' : 'expense'}
        onClose={() => setAddingCategory(false)}
        onCreated={setCategoryId}
      />
    </Sheet>
  )
}
