import clsx from 'clsx'
import { ArrowRightLeft, CheckSquare, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { SubHeader } from '@/components/AppShell'
import { AccountSelect } from '@/components/AccountSelect'
import { AccountSheet } from '@/components/AccountSheet'
import { TransactionRow } from '@/components/TransactionList'
import { TransactionSheet } from '@/components/TransactionSheet'
import { TransferSheet } from '@/components/TransferSheet'
import { EmptyState, Sheet, Spinner, useToast } from '@/components/ui'
import { useApp } from '@/hooks/useApp'
import { groupByDay } from '@/hooks/useMonthData'
import { formatDayLabel, formatMoney } from '@/lib/format'
import { useMoveTransactions, useTransactions } from '@/lib/queries'
import { planMove } from '@/lib/transfers'
import { groupAccountsByOwner } from '@/lib/wallets'
import type { Transaction } from '@/lib/types'

/**
 * Moi giao dich tung cham vao mot tai khoan, tu truoc toi nay.
 *
 * Sinh ra de sua lo nhap nham vi: chon ca loat roi doi sang tai khoan khac
 * mot lan, thay vi mo tung khoan ra sua. Muon doi chieu so du theo ky voi
 * ngan hang thi dung man Sao ke.
 */
export default function AccountDetail() {
  const { id = '' } = useParams()
  const { accountById, balanceOf, accounts, members, profile } = useApp()
  const account = accountById(id)

  // Lay toan bo lich su: khoan nhap nham co the nam o thang nao cung duoc.
  const query = useTransactions('1970-01-01', '2999-12-31')
  const rows = useMemo(
    () =>
      (query.data ?? []).filter(
        (t) =>
          t.account_id === id || (t.type === 'transfer' && t.to_account_id === id),
      ),
    [query.data, id],
  )

  const wallet = useMemo(
    () =>
      groupAccountsByOwner(accounts, members, profile?.id).find((g) =>
        g.accountIds.includes(id),
      ),
    [accounts, members, profile?.id, id],
  )

  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [moving, setMoving] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [editingAccount, setEditingAccount] = useState(false)
  const [transferring, setTransferring] = useState(false)

  // Khoan da chon co the bien mat (nguoi kia xoa) - chi tinh nhung khoan con.
  const pickedRows = useMemo(() => rows.filter((t) => picked.has(t.id)), [rows, picked])

  const toggle = (txId: string) =>
    setPicked((s) => {
      const next = new Set(s)
      if (next.has(txId)) next.delete(txId)
      else next.add(txId)
      return next
    })

  const stopSelecting = () => {
    setSelecting(false)
    setPicked(new Set())
  }

  if (!account) {
    return (
      <div className="page-pad">
        <SubHeader title="Tài khoản" />
        <div className="card mx-4">
          <EmptyState icon="👛" title="Không tìm thấy tài khoản" hint="Có thể nó vừa bị xoá." />
        </div>
      </div>
    )
  }

  const balance = balanceOf(account.id)
  const allPicked = rows.length > 0 && pickedRows.length === rows.length

  return (
    <div className="page-pad">
      <SubHeader
        title={`${account.icon} ${account.name}`}
        subtitle={`${wallet?.name ?? 'Đã ẩn'} · Số dư ${formatMoney(balance)}`}
        right={
          <button
            onClick={() => setEditingAccount(true)}
            aria-label="Sửa tài khoản"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-200/60 text-ink-600 transition active:scale-90 dark:bg-white/5 dark:text-ink-300"
          >
            <Pencil size={18} />
          </button>
        }
      />

      <div className="space-y-3 px-4">
        <div className="flex gap-2">
          <button
            className="btn-ghost flex-1 py-2.5 text-sm"
            onClick={() => setTransferring(true)}
            disabled={account.archived}
          >
            <ArrowRightLeft size={16} /> Chuyển tiền đi
          </button>
          <button
            className={clsx(
              'btn flex-1 py-2.5 text-sm',
              selecting
                ? 'bg-brand-600 text-white'
                : 'bg-ink-100 text-ink-700 dark:bg-white/5 dark:text-ink-200',
            )}
            onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
            disabled={rows.length === 0}
          >
            <CheckSquare size={16} /> {selecting ? 'Xong' : 'Chọn nhiều'}
          </button>
        </div>

        {selecting && (
          <div className="flex items-center justify-between gap-3 px-1 text-[13px]">
            <span className="text-ink-500">Bấm vào từng khoản để chọn</span>
            <button
              className="font-semibold text-brand-600 dark:text-brand-400"
              onClick={() => setPicked(allPicked ? new Set() : new Set(rows.map((t) => t.id)))}
            >
              {allPicked ? 'Bỏ chọn hết' : `Chọn cả ${rows.length} khoản`}
            </button>
          </div>
        )}

        {query.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6 text-ink-400" />
          </div>
        ) : rows.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="🧾"
              title="Chưa có giao dịch nào"
              hint="Các khoản thu, chi và chuyển tiền dùng tài khoản này sẽ hiện ở đây."
            />
          </div>
        ) : (
          groupByDay(rows).map(([day, items]) => (
            <section key={day} className="card overflow-hidden">
              <h3 className="px-4 pt-3 text-[13px] font-bold uppercase tracking-wide text-ink-500">
                {formatDayLabel(day)}
              </h3>
              <div className="mt-1 divide-y divide-ink-200/60 dark:divide-white/5">
                {items.map((t) => (
                  <TransactionRow
                    key={t.id}
                    tx={t}
                    accountId={account.id}
                    selected={selecting ? picked.has(t.id) : undefined}
                    onClick={() => (selecting ? toggle(t.id) : setEditingTx(t))}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        {/* Chua cho thanh hanh dong ben duoi khong che mat dong cuoi */}
        {selecting && <div className="h-24" />}
      </div>

      {/*
        Thanh hanh dong dat de len ca nut "+" noi (z cao hon, cao hon nut), vi
        dang chon nhieu ma lo bam trung "+" thi mat het lua chon.
      */}
      {selecting && (
        <div className="fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--sab))] z-[35] mx-auto max-w-lg border-t border-ink-200/70 bg-ink-50/95 px-4 pb-4 pt-3 backdrop-blur-xl dark:border-white/10 dark:bg-ink-950/95">
          <p className="mb-2 text-center text-[13px] text-ink-500">
            {pickedRows.length > 0
              ? `Đã chọn ${pickedRows.length} khoản`
              : 'Chưa chọn khoản nào'}
          </p>
          <button
            className="btn-primary w-full"
            disabled={pickedRows.length === 0}
            onClick={() => setMoving(true)}
          >
            <ArrowRightLeft size={18} /> Đổi sang tài khoản khác
          </button>
        </div>
      )}

      <MoveSheet
        open={moving}
        onClose={() => setMoving(false)}
        onDone={stopSelecting}
        fromAccountId={account.id}
        fromName={account.name}
        rows={pickedRows}
      />

      <TransactionSheet
        open={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
      />

      <AccountSheet
        open={editingAccount}
        account={account}
        onClose={() => setEditingAccount(false)}
      />

      <TransferSheet
        open={transferring}
        onClose={() => setTransferring(false)}
        fromAccountId={account.id}
      />
    </div>
  )
}

function MoveSheet({
  open,
  onClose,
  onDone,
  fromAccountId,
  fromName,
  rows,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void
  fromAccountId: string
  fromName: string
  rows: Transaction[]
}) {
  const { accountById } = useApp()
  const move = useMoveTransactions()
  const toast = useToast()
  const [target, setTarget] = useState<string | null>(null)

  const plan = useMemo(
    () => (target ? planMove(rows, fromAccountId, target) : null),
    [rows, fromAccountId, target],
  )
  const targetName = accountById(target)?.name ?? ''
  const selfTransfers = plan?.skipped.filter((s) => s.reason === 'same-account').length ?? 0

  const close = () => {
    setTarget(null)
    onClose()
  }

  const submit = async () => {
    if (!plan || plan.moves.length === 0) return
    try {
      const r = await move.mutateAsync(plan.moves)
      const problems = r.conflicts + r.failed
      if (problems > 0) {
        toast(
          `Đã chuyển ${r.moved} khoản · ${problems} khoản không đổi được (người kia vừa sửa hoặc xoá)`,
          'error',
        )
      } else {
        toast(
          r.pending
            ? `Đã lưu ${r.moved} khoản vào máy · sẽ gửi khi có mạng`
            : `Đã chuyển ${r.moved} khoản sang ${targetName}`,
        )
      }
      close()
      onDone()
    } catch {
      toast('Đổi tài khoản thất bại', 'error')
    }
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Đổi sang tài khoản khác"
      footer={
        <button
          className="btn-primary w-full"
          disabled={!plan || plan.moves.length === 0 || move.isPending}
          onClick={() => void submit()}
        >
          {move.isPending ? <Spinner /> : null}
          {plan ? `Đổi ${plan.moves.length} khoản` : 'Chọn tài khoản đích'}
        </button>
      }
    >
      <p className="mb-4 text-[14px] leading-relaxed text-ink-600 dark:text-ink-300">
        {rows.length} khoản đã chọn đang ghi ở <b>{fromName}</b>. Chuyển chúng sang:
      </p>

      <AccountSelect value={target} onChange={setTarget} exclude={[fromAccountId]} />

      {plan && (
        <div className="mt-4 space-y-2 rounded-2xl bg-ink-100 px-4 py-3 text-[13px] leading-relaxed dark:bg-white/5">
          <p>
            Số dư <b>{fromName}</b> và <b>{targetName}</b> sẽ được tính lại theo. Ngày, số tiền,
            danh mục và ghi chú giữ nguyên.
          </p>
          {selfTransfers > 0 && (
            <p className="text-amber-700 dark:text-amber-400">
              Bỏ qua {selfTransfers} khoản chuyển tiền giữa {fromName} và {targetName} — đổi xong
              sẽ thành tự chuyển cho chính mình. Hãy xoá khoản đó nếu nó vốn là nhập nhầm.
            </p>
          )}
        </div>
      )}
    </Sheet>
  )
}
