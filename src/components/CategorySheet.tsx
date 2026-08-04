import clsx from 'clsx'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '@/hooks/useApp'
import { errorMessage } from '@/lib/errors'
import { useDeleteCategory, useSaveCategory } from '@/lib/queries'
import type { Category, CategoryKind } from '@/lib/types'
import { Field, Sheet, Spinner, useConfirm, useToast } from './ui'

/** Bo mau da qua kiem tra do phan biet cho nguoi mu mau - xem src/lib/palette.ts */
export const CATEGORY_COLORS = [
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

export const CATEGORY_ICONS = [
  '🍜','🛒','🛵','🏠','🧾','💊','🧸','🛍️','🎬','📚','🎁','☕','🍺','⛽','🚕','✈️',
  '🏥','💇','🐶','🎮','📱','👕','🧹','🔧','🎂','💐','💰','🏆','📈','🏦','✨','📦',
]

/**
 * Man hinh them/sua danh muc. Dung o hai noi:
 *  - Trang "Danh mục" (sua, an, xoa)
 *  - Ngay trong form them giao dich, khi can tao danh muc moi giua chung
 *    (luc do truyen onCreated de chon luon danh muc vua tao).
 */
export function CategorySheet({
  open,
  category,
  kind,
  onClose,
  onCreated,
}: {
  open: boolean
  category: Category | null
  /** Loai danh muc khi tao moi (khi sua thi lay theo danh muc dang sua). */
  kind: CategoryKind
  onClose: () => void
  /** Goi sau khi tao MOI thanh cong, kem id cua danh muc vua tao. */
  onCreated?: (id: string) => void
}) {
  const { household } = useApp()
  const save = useSaveCategory()
  const del = useDeleteCategory()
  const toast = useToast()
  const confirm = useConfirm()

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📦')
  const [color, setColor] = useState(CATEGORY_COLORS[0])
  const [archived, setArchived] = useState(false)

  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setName(category?.name ?? '')
      setIcon(category?.icon ?? (kind === 'income' ? '💰' : '📦'))
      setColor(category?.color ?? CATEGORY_COLORS[0])
      setArchived(category?.archived ?? false)
    }
  }

  const submit = async () => {
    if (!household || !name.trim()) return
    try {
      const { id } = await save.mutateAsync({
        id: category?.id,
        household_id: household.id,
        name: name.trim(),
        icon,
        color,
        kind: category?.kind ?? kind,
        archived,
      })
      toast(category ? 'Đã cập nhật danh mục' : 'Đã thêm danh mục')
      if (!category) onCreated?.(id)
      onClose()
    } catch (e) {
      toast(errorMessage(e, 'Lưu thất bại'), 'error')
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
      title={
        category ? 'Sửa danh mục' : kind === 'income' ? 'Danh mục thu mới' : 'Danh mục chi mới'
      }
      footer={
        <div className="flex gap-3">
          {category && (
            <button className="btn btn-danger px-4" onClick={remove} aria-label="Xoá">
              <Trash2 size={18} />
            </button>
          )}
          <button
            className="btn-primary flex-1"
            disabled={!name.trim() || save.isPending}
            onClick={submit}
          >
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
          autoFocus={!category}
        />
      </Field>

      <Field label="Biểu tượng">
        <div className="grid max-h-44 grid-cols-8 gap-2 overflow-y-auto rounded-2xl bg-ink-100 p-2 dark:bg-white/5">
          {CATEGORY_ICONS.map((i) => (
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
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Chọn màu ${c}`}
              className={clsx(
                'h-10 w-10 rounded-2xl transition active:scale-90',
                color === c &&
                  'ring-2 ring-ink-950 ring-offset-2 ring-offset-ink-50 dark:ring-white dark:ring-offset-ink-950',
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
