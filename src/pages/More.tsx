import {
  ChevronRight,
  CreditCard,
  FileText,
  HandCoins,
  History,
  Repeat,
  Settings,
  Shapes,
  Target,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/AppShell'
import { useApp } from '@/hooks/useApp'
import { dayjs, formatMoney } from '@/lib/format'

const ITEMS = [
  {
    to: '/more/budgets',
    icon: Target,
    label: 'Ngân sách tháng',
    hint: 'Đặt hạn mức cho từng danh mục',
  },
  { to: '/more/accounts', icon: CreditCard, label: 'Ví & tài khoản', hint: 'Ví của từng người và ví chung của nhà' },
  {
    to: '/more/statement',
    icon: FileText,
    label: 'Sao kê tài khoản',
    hint: 'Vào ra từng tài khoản trong tháng, đối chiếu với ngân hàng',
  },
  { to: '/more/categories', icon: Shapes, label: 'Danh mục', hint: 'Tuỳ chỉnh danh mục thu chi' },
  {
    to: '/more/activity',
    icon: History,
    label: 'Nhật ký',
    hint: 'Ai đã thêm, sửa, xoá gì và lúc nào',
  },
  { to: '/more/debts', icon: HandCoins, label: 'Vay & cho vay', hint: 'Theo dõi các khoản nợ' },
  { to: '/more/bills', icon: Repeat, label: 'Hoá đơn định kỳ', hint: 'Tiền nhà, internet, học phí…' },
  { to: '/more/family', icon: Users, label: 'Gia đình', hint: 'Thành viên và mã mời' },
  { to: '/more/settings', icon: Settings, label: 'Cài đặt', hint: 'Giao diện, xuất dữ liệu, đăng xuất' },
]

export default function More() {
  const { accounts, balanceOf, household, members } = useApp()
  const total = accounts.filter((a) => !a.archived).reduce((s, a) => s + balanceOf(a.id), 0)

  return (
    <div className="page-pad">
      <PageHeader
        title="Thêm"
        subtitle={`${household?.name ?? 'Gia đình'} · ${members.length} thành viên`}
      />

      <div className="px-4">
        <section className="card mb-4 p-4">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-500">
            Tổng tài sản trong ví
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">{formatMoney(total)}</p>
        </section>

        <section className="card divide-y divide-ink-200/60 overflow-hidden dark:divide-white/5">
          {ITEMS.map(({ to, icon: Icon, label, hint }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 px-4 py-3.5 transition active:bg-ink-100 dark:active:bg-white/5"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-600/10 text-brand-600 dark:text-brand-400">
                <Icon size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{label}</span>
                <span className="block truncate text-[13px] text-ink-500">{hint}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-ink-400" />
            </Link>
          ))}
        </section>

        {/*
          Chu repo doc cho nay de biet lan reload vua roi da an ban moi chua -
          PWA tren iOS giu ban cu trong cache toi khi service worker cap nhat.
          Nen kem ca gio build: quen tang so phien ban thi van phan biet duoc.
        */}
        <p className="mt-6 text-center text-[12px] text-ink-400">
          MoneySaver · v{__APP_VERSION__}
        </p>
        <p className="mt-0.5 text-center text-[11px] text-ink-400/70">
          Bản dựng {dayjs(__BUILD_TIME__).format('DD/MM/YYYY HH:mm')}
        </p>
      </div>
    </div>
  )
}
