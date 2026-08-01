import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Kiem tra "bo nao" cua che do offline.
 *
 * Supabase duoc thay bang ban gia de mo phong: mat mang, may chu tu choi,
 * hoac gui thanh cong - roi xem hang doi xu ly dung khong.
 */

/** Ghi lai moi lenh da thuc su gui len "may chu". */
const sent: { table: string; action: string; payload: unknown }[] = []

/** Loi se duoc nem ra o cac lan goi tiep theo (mo phong su co). */
let failWith: unknown = null
/** So lan con phai nem loi. Infinity = hong lien tuc. */
let failRemaining = Infinity

vi.mock('./supabase', () => {
  const boom = () => {
    if (failWith && failRemaining > 0) {
      failRemaining--
      throw failWith
    }
  }
  const result = () => ({ error: null })

  return {
    supabase: {
      from: (table: string) => ({
        insert: async (values: unknown) => {
          boom()
          sent.push({ table, action: 'insert', payload: values })
          return result()
        },
        upsert: async (values: unknown) => {
          boom()
          sent.push({ table, action: 'upsert', payload: values })
          return result()
        },
        update: (values: unknown) => ({
          match: async (m: unknown) => {
            boom()
            sent.push({ table, action: 'update', payload: { values, match: m } })
            return result()
          },
        }),
        delete: () => ({
          match: async (m: unknown) => {
            boom()
            sent.push({ table, action: 'delete', payload: { match: m } })
            return result()
          },
        }),
      }),
    },
  }
})

import {
  clearOutbox,
  flushOutbox,
  getOutboxCount,
  isNetworkError,
  newId,
  sendOrQueue,
} from './outbox'

/** Bat/tat mang gia lap. */
function setOnline(value: boolean) {
  Object.defineProperty(globalThis.navigator, 'onLine', { value, configurable: true })
}

/** Loi mang that su cua trinh duyet: fetch chua bao gio roi khoi may. */
const networkFailure = new TypeError('Failed to fetch')
/** Loi Safari hay tra ve khi mat song giua chung. */
const safariFailure = new TypeError('Load failed')
/** Loi tu Postgres: may chu DA nhan duoc yeu cau va tu choi. */
const serverRejection = { code: '23505', message: 'duplicate key value' }

beforeEach(() => {
  sent.length = 0
  failWith = null
  failRemaining = Infinity
  localStorage.clear()
  clearOutbox()
  setOnline(true)
})

afterEach(() => {
  clearOutbox()
})

describe('phan biet loi mang voi loi du lieu', () => {
  it('coi loi fetch that bai la loi mang', () => {
    expect(isNetworkError(networkFailure)).toBe(true)
    expect(isNetworkError(safariFailure)).toBe(true)
  })

  it('KHONG coi loi co ma tu Postgres la loi mang', () => {
    expect(isNetworkError(serverRejection)).toBe(false)
  })

  it('coi moi thu la loi mang khi may dang offline', () => {
    setOnline(false)
    expect(isNetworkError(new Error('bat ky'))).toBe(true)
  })
})

describe('ghi khi dang co mang', () => {
  it('gui thang len may chu, khong xep hang doi', async () => {
    const pending = await sendOrQueue({
      table: 'transactions',
      action: 'insert',
      values: { id: 'tx-1', amount: 50000 },
    })

    expect(pending).toBe(false)
    expect(getOutboxCount()).toBe(0)
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ table: 'transactions', action: 'insert' })
  })

  it('nem loi ra ngoai khi may chu tu choi, khong nuot lang', async () => {
    failWith = serverRejection
    await expect(
      sendOrQueue({ table: 'transactions', action: 'insert', values: { id: 'x' } }),
    ).rejects.toBe(serverRejection)
    expect(getOutboxCount()).toBe(0)
  })
})

describe('ghi khi mat mang', () => {
  it('xep vao hang doi va bao cho giao dien biet', async () => {
    setOnline(false)

    const pending = await sendOrQueue({
      table: 'transactions',
      action: 'insert',
      values: { id: 'tx-1', amount: 50000 },
    })

    expect(pending).toBe(true)
    expect(getOutboxCount()).toBe(1)
    expect(sent).toHaveLength(0)
  })

  it('day het len may chu theo dung thu tu khi co mang lai', async () => {
    setOnline(false)
    await sendOrQueue({ table: 'transactions', action: 'insert', values: { id: 'tx-1' } })
    await sendOrQueue({
      table: 'transactions',
      action: 'update',
      values: { amount: 99 },
      match: { id: 'tx-1' },
    })
    await sendOrQueue({ table: 'transactions', action: 'delete', match: { id: 'tx-0' } })
    expect(getOutboxCount()).toBe(3)

    setOnline(true)
    const { sent: count } = await flushOutbox()

    expect(count).toBe(3)
    expect(getOutboxCount()).toBe(0)
    expect(sent.map((s) => s.action)).toEqual(['insert', 'update', 'delete'])
  })

  it('giu nguyen hang doi khi mang lai chap chon giua chung', async () => {
    setOnline(false)
    await sendOrQueue({ table: 'transactions', action: 'insert', values: { id: 'a' } })
    await sendOrQueue({ table: 'transactions', action: 'insert', values: { id: 'b' } })

    setOnline(true)
    failWith = safariFailure
    const first = await flushOutbox()

    expect(first.sent).toBe(0)
    expect(getOutboxCount()).toBe(2) // van con nguyen, khong mat ban ghi nao

    failWith = null
    const second = await flushOutbox()
    expect(second.sent).toBe(2)
    expect(getOutboxCount()).toBe(0)
  })

  it('bo qua thao tac bi may chu tu choi de khong ket cung ca hang doi', async () => {
    setOnline(false)
    await sendOrQueue({ table: 'transactions', action: 'insert', values: { id: 'hong' } })
    await sendOrQueue({ table: 'transactions', action: 'insert', values: { id: 'tot' } })

    setOnline(true)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Chi lenh dau bi may chu tu choi vinh vien.
    failWith = serverRejection
    failRemaining = 1

    const result = await flushOutbox()

    expect(result.dropped).toBe(1)
    expect(result.sent).toBe(1)
    expect(getOutboxCount()).toBe(0)
    // Lenh thu hai van phai di duoc, khong bi lenh hong chan lai.
    expect(sent.map((s) => (s.payload as { id: string }).id)).toEqual(['tot'])
    warn.mockRestore()
  })

  it('van con hang doi sau khi tat mo lai app', async () => {
    setOnline(false)
    await sendOrQueue({ table: 'transactions', action: 'insert', values: { id: 'tx-1' } })

    // Mo phong mo lai app: doc lai tu localStorage
    const raw = localStorage.getItem('moneysaver.outbox.v1')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!)).toHaveLength(1)
    expect(JSON.parse(raw!)[0]).toMatchObject({ table: 'transactions', action: 'insert' })
  })

  it('thao tac moi phai xep sau hang doi cu du dang co mang', async () => {
    setOnline(false)
    await sendOrQueue({ table: 'transactions', action: 'insert', values: { id: 'cu' } })

    setOnline(true)
    // Con viec ton dong => lenh moi cung phai vao hang doi, khong duoc vuot len truoc
    const pending = await sendOrQueue({
      table: 'transactions',
      action: 'insert',
      values: { id: 'moi' },
    })
    expect(pending).toBe(true)

    await flushOutbox()
    expect(sent.map((s) => (s.payload as { id: string }).id)).toEqual(['cu', 'moi'])
  })
})

describe('id sinh tai may khach', () => {
  it('dung dinh dang UUID v4 de Postgres chap nhan', () => {
    const id = newId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('khong trung nhau', () => {
    const ids = new Set(Array.from({ length: 500 }, newId))
    expect(ids.size).toBe(500)
  })
})
