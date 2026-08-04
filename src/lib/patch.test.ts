import { describe, expect, it } from 'vitest'
import { changedFields, diffRecords } from './patch'

/**
 * Day la thu quyet dinh mot thay doi cua nguoi kia co bi ghi de hay khong,
 * nen phai chac tay: bo sot mot o thi mat du lieu, bao thua mot o thi hop
 * thoai canh bao nhay lung tung va nguoi dung se bam bua cho xong.
 */

describe('chi giu lai nhung o that su doi', () => {
  const goc = {
    amount: 200_000,
    note: 'Ăn trưa',
    category_id: 'cat-1',
    to_account_id: null,
    is_shared: true,
  }

  it('sua mot o thi chi gui mot o', () => {
    expect(changedFields(goc, { ...goc, amount: 250_000 })).toEqual({ amount: 250_000 })
  })

  it('khong doi gi thi khong co gi de gui', () => {
    expect(changedFields(goc, { ...goc })).toEqual({})
  })

  it('them moi (khong co ban goc) thi gui tat ca', () => {
    expect(changedFields(null, goc)).toEqual(goc)
  })

  it('coi numeric dang chuoi cua Postgres bang voi so', () => {
    // PostgREST co the tra numeric(16,2) ve duoi dang "200000.00"
    expect(changedFields({ amount: '200000.00' }, { amount: 200_000 })).toEqual({})
  })

  it('coi null va undefined la mot - ca hai deu la "chua co gi"', () => {
    expect(changedFields({ to_account_id: null }, { to_account_id: undefined })).toEqual({})
  })

  it('nhan ra khi mot o dang rong duoc dien vao', () => {
    expect(changedFields({ category_id: null }, { category_id: 'cat-9' })).toEqual({
      category_id: 'cat-9',
    })
  })

  it('nhan ra khi mot o bi xoa trang', () => {
    expect(changedFields({ note: 'Ăn trưa' }, { note: '' })).toEqual({ note: '' })
  })

  it('phan biet false voi rong - gat tat "khoan chung" la mot thay doi that', () => {
    expect(changedFields({ is_shared: true }, { is_shared: false })).toEqual({ is_shared: false })
  })

  it('sua nhieu o thi gui du nhieu o', () => {
    const next = { ...goc, amount: 300_000, note: 'Ăn tối' }
    expect(changedFields(goc, next)).toEqual({ amount: 300_000, note: 'Ăn tối' })
  })
})

describe('ke lai nguoi kia da doi gi', () => {
  it('kem ca gia tri cu de con hien "200.000 -> 250.000"', () => {
    const cua_toi = { amount: 200_000, note: 'Ăn trưa' }
    const tren_may_chu = { amount: 250_000, note: 'Ăn trưa' }

    expect(diffRecords(cua_toi, tren_may_chu)).toEqual({
      amount: { from: 200_000, to: 250_000 },
    })
  })

  it('thieu mot ben thi khong ke gi ca, khong doan bua', () => {
    expect(diffRecords(null, { amount: 1 })).toEqual({})
    expect(diffRecords({ amount: 1 }, null)).toEqual({})
  })
})
