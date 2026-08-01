import { Download, LogOut, Moon, Share, Smartphone, Sun, SunMoon } from 'lucide-react'
import { useState } from 'react'
import { SubHeader } from '@/components/AppShell'
import { Segmented, Spinner, useConfirm, useToast } from '@/components/ui'
import { useApp } from '@/hooks/useApp'
import { dayjs } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useUI } from '@/lib/store'
import type { Transaction } from '@/lib/types'

export default function Settings() {
  const { theme, setTheme } = useUI()
  const { signOut, household, categoryById, accountById, memberById, session } = useApp()
  const [exporting, setExporting] = useState(false)
  const toast = useToast()
  const confirm = useConfirm()

  const exportCsv = async () => {
    setExporting(true)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('occurred_at', { ascending: false })
      if (error) throw error

      const rows = (data ?? []) as Transaction[]
      if (rows.length === 0) {
        toast('Chưa có giao dịch nào để xuất', 'error')
        return
      }

      const header = [
        'Ngày',
        'Loại',
        'Số tiền',
        'Danh mục',
        'Ví',
        'Đến ví',
        'Người chi',
        'Chung/Riêng',
        'Ghi chú',
      ]

      const TYPE_LABEL = { expense: 'Chi', income: 'Thu', transfer: 'Chuyển khoản' }

      const body = rows.map((t) => [
        t.occurred_at,
        TYPE_LABEL[t.type],
        String(Number(t.amount)),
        categoryById(t.category_id)?.name ?? '',
        accountById(t.account_id)?.name ?? '',
        accountById(t.to_account_id)?.name ?? '',
        memberById(t.payer_id)?.display_name ?? '',
        t.type === 'transfer' ? '' : t.is_shared ? 'Chung' : 'Riêng',
        t.note,
      ])

      // BOM ﻿ de Excel doc dung tieng Viet co dau
      const csv =
        '﻿' +
        [header, ...body].map((r) => r.map(csvCell).join(',')).join('\r\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `moneysaver-${dayjs().format('YYYYMMDD')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast(`Đã xuất ${rows.length} giao dịch`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Xuất dữ liệu thất bại', 'error')
    } finally {
      setExporting(false)
    }
  }

  const doSignOut = async () => {
    const ok = await confirm({
      title: 'Đăng xuất?',
      message: 'Dữ liệu vẫn được giữ trên máy chủ, bạn đăng nhập lại là thấy đầy đủ.',
      confirmLabel: 'Đăng xuất',
      danger: true,
    })
    if (ok) await signOut()
  }

  return (
    <div className="page-pad">
      <SubHeader title="Cài đặt" />

      <div className="space-y-5 px-4">
        <section className="card p-4">
          <h2 className="mb-3 font-bold">Giao diện</h2>
          <Segmented
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: <span className="flex items-center justify-center gap-1.5"><Sun size={15} /> Sáng</span> },
              { value: 'dark', label: <span className="flex items-center justify-center gap-1.5"><Moon size={15} /> Tối</span> },
              { value: 'system', label: <span className="flex items-center justify-center gap-1.5"><SunMoon size={15} /> Tự động</span> },
            ]}
          />
        </section>

        <section className="card p-4">
          <h2 className="flex items-center gap-2 font-bold">
            <Smartphone size={18} className="text-ink-400" />
            Cài lên iPhone
          </h2>
          <ol className="mt-3 space-y-2 text-[14px] leading-relaxed text-ink-600 dark:text-ink-300">
            <li className="flex gap-2">
              <span className="font-bold text-brand-600 dark:text-brand-400">1.</span>
              Mở app này bằng <b>Safari</b> (không dùng Chrome trên iPhone)
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand-600 dark:text-brand-400">2.</span>
              <span className="flex flex-wrap items-center gap-1">
                Bấm nút Chia sẻ <Share size={15} className="inline" /> ở thanh dưới
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand-600 dark:text-brand-400">3.</span>
              Chọn <b>“Thêm vào MH chính”</b> (Add to Home Screen)
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand-600 dark:text-brand-400">4.</span>
              Xong! App chạy toàn màn hình như app tải từ App Store.
            </li>
          </ol>
        </section>

        <section className="card divide-y divide-ink-200/60 overflow-hidden dark:divide-white/5">
          <button
            onClick={exportCsv}
            disabled={exporting}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-ink-100 disabled:opacity-50 dark:active:bg-white/5"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-600/10 text-brand-600 dark:text-brand-400">
              {exporting ? <Spinner /> : <Download size={19} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Xuất dữ liệu (CSV)</span>
              <span className="block text-[13px] text-ink-500">Mở được bằng Excel, Google Sheets</span>
            </span>
          </button>

          <button
            onClick={doSignOut}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-ink-100 dark:active:bg-white/5"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-red-500/10 text-red-500">
              <LogOut size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-red-500">Đăng xuất</span>
              <span className="block truncate text-[13px] text-ink-500">{session?.user.email}</span>
            </span>
          </button>
        </section>

        <p className="text-center text-[12px] text-ink-400">
          {household?.name} · MoneySaver v1.0
        </p>
      </div>
    </div>
  )
}

/** Boc dau nhay cho o CSV khi can. */
function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}
