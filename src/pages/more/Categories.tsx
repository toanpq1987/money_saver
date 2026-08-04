import { Plus } from 'lucide-react'
import { useState } from 'react'
import { SubHeader } from '@/components/AppShell'
import { CategorySheet } from '@/components/CategorySheet'
import { Segmented } from '@/components/ui'
import { useApp } from '@/hooks/useApp'
import type { Category, CategoryKind } from '@/lib/types'

export default function Categories() {
  const { categories } = useApp()
  const [kind, setKind] = useState<CategoryKind>('expense')
  const [editing, setEditing] = useState<Category | null>(null)
  const [creating, setCreating] = useState(false)

  const list = categories.filter((c) => c.kind === kind)
  const live = list.filter((c) => !c.archived)
  const archived = list.filter((c) => c.archived)

  return (
    <div className="page-pad">
      <SubHeader title="Danh mục" subtitle="Bấm vào một danh mục để sửa" />

      <div className="space-y-4 px-4">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'expense', label: 'Khoản chi' },
            { value: 'income', label: 'Khoản thu' },
          ]}
        />

        <section className="card divide-y divide-ink-200/60 overflow-hidden dark:divide-white/5">
          {live.map((c) => (
            <button
              key={c.id}
              onClick={() => setEditing(c)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-ink-100 dark:active:bg-white/5"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-lg"
                style={{ background: `${c.color}22` }}
              >
                {c.icon}
              </span>
              <span className="flex-1 truncate text-[15px] font-semibold">{c.name}</span>
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
            </button>
          ))}
        </section>

        <button className="btn-ghost w-full" onClick={() => setCreating(true)}>
          <Plus size={18} /> Thêm danh mục
        </button>

        {archived.length > 0 && (
          <section>
            <h2 className="mb-2 px-1 text-[13px] font-bold uppercase tracking-wide text-ink-500">
              Đã ẩn
            </h2>
            <div className="card divide-y divide-ink-200/60 overflow-hidden opacity-60 dark:divide-white/5">
              {archived.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setEditing(c)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="text-lg">{c.icon}</span>
                  <span className="flex-1 truncate text-[15px] font-semibold">{c.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <CategorySheet
        open={creating || Boolean(editing)}
        category={editing}
        kind={kind}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
