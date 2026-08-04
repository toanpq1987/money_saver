import { describe, expect, it } from 'vitest'
import { describeChanges, describeRecord, shortId } from './activity'
import type { ActivityLog } from './types'

/**
 * Nhat ky chi co gia tri khi doc vao la biet ngay dong do noi ve khoan NAO.
 * Hai khoan cung ghi chu cung so tien la chuyen binh thuong trong mot gia
 * dinh (do xang, di cho...), nen phan phan biet phai chac.
 */

const names = {
  category: (id: string | null) => (id === 'cat-1' ? 'Di chuyển' : 'Đã xoá'),
  account: (id: string | null) => (id === 'acc-1' ? 'Vietcombank Mami' : 'Đã xoá'),
  member: (id: string | null) => (id === 'p-1' ? 'Daddy' : id === 'p-2' ? 'Mami' : 'Đã xoá'),
}

function log(partial: Partial<ActivityLog>): ActivityLog {
  return {
    id: 'log-1',
    household_id: 'h',
    actor_id: 'p-1',
    table_name: 'transactions',
    record_id: '6f9619ff-8b86-d011-b42d-00c04fc964ff',
    action: 'update',
    changed: null,
    snapshot: null,
    created_at: '2026-08-04T15:00:00Z',
    ...partial,
  }
}

describe('ma ngan de phan biet hai khoan giong nhau', () => {
  it('gon lai con 6 ky tu, bo dau gach', () => {
    expect(shortId('6f9619ff-8b86-d011-b42d-00c04fc964ff')).toBe('6F9619')
  })

  it('hai giao dich khac nhau ra hai ma khac nhau', () => {
    const a = shortId('6f9619ff-8b86-d011-b42d-00c04fc964ff')
    const b = shortId('11112222-8b86-d011-b42d-00c04fc964ff')
    expect(a).not.toBe(b)
  })
})

describe('dong tom tat cho biet la khoan nao', () => {
  it('co ngay giao dich o dau - thu dau tien phan biet hai khoan giong nhau', () => {
    const text = describeRecord(
      log({ snapshot: { occurred_at: '2026-08-03', note: 'Đổ xăng xe oto', amount: 800000 } }),
      names,
    )
    expect(text).toBe('03/08 · Đổ xăng xe oto · 800.000 ₫')
  })

  it('khong co ghi chu thi lay ten danh muc thay the', () => {
    const text = describeRecord(
      log({ snapshot: { occurred_at: '2026-08-03', note: '', category_id: 'cat-1', amount: 50000 } }),
      names,
    )
    expect(text).toBe('03/08 · Di chuyển · 50.000 ₫')
  })

  it('voi tai khoan thi lay ten tai khoan', () => {
    const text = describeRecord(
      log({ table_name: 'accounts', snapshot: { name: 'Vietcombank Mami' } }),
      names,
    )
    expect(text).toBe('Vietcombank Mami')
  })

  it('khong co snapshot thi tra ve rong, khong doan bua', () => {
    expect(describeRecord(log({ snapshot: null }), names)).toBe('')
  })
})

describe('ke lai da doi nhung gi', () => {
  it('doi uuid thanh ten nguoi, ten vi', () => {
    const lines = describeChanges(
      {
        payer_id: { from: 'p-1', to: 'p-2' },
        account_id: { from: null, to: 'acc-1' },
      },
      names,
    )

    expect(lines).toEqual([
      { field: 'payer_id', label: 'Người chi', from: 'Daddy', to: 'Mami' },
      { field: 'account_id', label: 'Ví / tài khoản', from: '(trống)', to: 'Vietcombank Mami' },
    ])
  })

  it('so tien hien duoi dang tien te chu khong phai so tho', () => {
    const [line] = describeChanges({ amount: { from: 200000, to: 250000 } }, names)
    expect(line.from).toBe('200.000 ₫')
    expect(line.to).toBe('250.000 ₫')
  })

  it('bo qua cac cot ky thuat nguoi dung khong can biet', () => {
    const lines = describeChanges(
      {
        updated_at: { from: 'a', to: 'b' },
        household_id: { from: 'x', to: 'y' },
        note: { from: 'cũ', to: 'mới' },
      },
      names,
    )
    expect(lines.map((l) => l.field)).toEqual(['note'])
  })

  it('khong co gi doi thi khong ke gi', () => {
    expect(describeChanges(null, names)).toEqual([])
  })
})
