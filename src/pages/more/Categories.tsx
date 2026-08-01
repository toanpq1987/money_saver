import clsx from 'clsx'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { SubHeader } from '@/components/AppShell'
import { Field, Segmented, Sheet, Spinner, useConfirm, useToast } from '@/components/ui'
import { useApp } from '@/hooks/useApp'
import { useDeleteCategory, useSaveCategory } from '@/lib/queries'
import type { Category, CategoryKind } from '@/lib/types'

/** Bo mau da qua kiem tra do phan biet - xem src/lib/palette.ts */
const COLORS = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#4a3aa7',
  '#e34948',
  '#898781',
]

const ICONS = [
  '🍜','🛒','🛵','🏠','🧾','💊','🧸','🛍️','🎬','📚','🎁','☕','🍺','⛽','🚕','✈️',
  '🏥','💇','🐶','🎮','📱','👕','🧹','🔧','🎂','💐','💰','🏆','📈','🏦','✨','📦',
]

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

function CategorySheet({
  open,
  category,
  kind,
  onClose,
}: {
  open: boolean
  category: Category | null
  kind: CategoryKind
  onClose: () => void
}) {
  const { household } = useApp()
  const save = useSaveCategory()
  const del = useDeleteCategory()
  const toast = useToast()
  const confirm = useConfirm()

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📦')
  const [color, setColor] = useState(COLORS[0])
  const [archived, setArchived] = useState(false)

  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setName(category?.name ?? '')
      setIcon(category?.icon ?? (kind === 'income' ? '💰' : '📦'))
      setColor(category?.color ?? COLORS[0])
      setArchived(category?.archived ?? false)
    }
  }

  const submit = async () => {
    if (!household || !name.trim()) return
    try {
      await save.mutateAsync({
        id: category?.id,
        household_id: household.id,
        name: name.trim(),
        icon,
        color,
        kind: category?.kind ?? kind,
        archived,
      })
      toast(category ? 'Đã cập nhật danh mục' : 'Đã thêm danh mục')
      onClose()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Lưu thất bại', 'error')
    }
  }

  const remove = async () => {
    if (!category) return
    const ok = await confirm({
      title: `Xoá danh mục “${category.name}”?`,
      message:
        'Các giao dịch cũ sẽ trở thành “Chưa phân loại”. Nếu chỉ muốn ngừng dùng, hãy chọn “Ẩn danh mục”.',
      confirmLabel: 'Xoá',
      danger: true,
    })
    if (!ok) return
    await del.mutateAsync(category.id)
    toast('Đã xoá danh mục')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={category ? 'Sửa danh mục' : 'Danh mục mới'}
      footer={
        <div className="flex gap-3">
          {category && (
            <button className="btn btn-danger px-4" onClick={remove} aria-label="Xoá">
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn-primary flex-1" disabled={!name.trim() || save.isPending} onClick={submit}>
            {save.isPending && <Spinner />}
            Lưu
          </button>
        </div>
      }
    >
      <Field label="Tên danh mục">
        <input
          className="field"
          placeholder="VD: Cà phê"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Biểu tượng">
        <div className="grid max-h-44 grid-cols-8 gap-2 overflow-y-auto rounded-2xl bg-ink-100 p-2 dark:bg-white/5">
          {ICONS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIcon(i)}
              className={clsx(
                'grid h-10 place-items-center rounded-xl text-lg transition active:scale-90',
                icon === i && 'bg-brand-600 shadow-md',
              )}
            >
              {i}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Màu">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Chọn màu ${c}`}
              className={clsx(
                'h-10 w-10 rounded-2xl transition active:scale-90',
                color === c && 'ring-2 ring-ink-950 ring-offset-2 ring-offset-ink-50 dark:ring-white dark:ring-offset-ink-950',
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </Field>

      {category && (
        <label className="flex items-center gap-3 rounded-2xl bg-ink-100 px-4 py-3 dark:bg-white/5">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
            className="h-5 w-5 rounded accent-brand-600"
          />
          <span className="text-[15px] font-semibold">Ẩn danh mục này</span>
        </label>
      )}
    </Sheet>
  )
}
