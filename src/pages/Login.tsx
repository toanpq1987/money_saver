import { useState } from 'react'
import { Spinner, useToast } from '@/components/ui'
import { supabase } from '@/lib/supabase'

type Mode = 'signin' | 'signup'

export default function Login() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const toast = useToast()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        // Neu du an bat xac nhan email thi chua co session ngay
        if (!data.session) setNeedsConfirm(true)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      toast(translateAuthError(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (needsConfirm) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 p-6 text-center">
        <div className="text-5xl">📬</div>
        <h1 className="text-2xl font-extrabold">Kiểm tra email nhé</h1>
        <p className="text-[15px] leading-relaxed text-ink-500">
          Supabase đã gửi link xác nhận tới <b className="text-ink-700 dark:text-ink-200">{email}</b>.
          Bấm vào link đó rồi quay lại đăng nhập.
        </p>
        <button className="btn-ghost mt-2" onClick={() => setNeedsConfirm(false)}>
          Quay lại
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center p-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-brand-400 to-brand-700 text-4xl shadow-xl shadow-brand-600/30">
          💰
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">MoneySaver</h1>
        <p className="mt-1 text-[15px] text-ink-500">Sổ chi tiêu chung của hai vợ chồng</p>
      </div>

      <form onSubmit={submit} className="card p-5">
        <div className="mb-5 flex gap-1 rounded-2xl bg-ink-200/60 p-1 dark:bg-white/5">
          {(
            [
              ['signin', 'Đăng nhập'],
              ['signup', 'Tạo tài khoản'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                mode === m
                  ? 'bg-white text-ink-950 shadow-sm dark:bg-ink-800 dark:text-white'
                  : 'text-ink-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="field mb-4"
          placeholder="ban@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="label" htmlFor="password">
          Mật khẩu
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          className="field mb-5"
          placeholder="Ít nhất 6 ký tự"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy && <Spinner />}
          {mode === 'signup' ? 'Tạo tài khoản' : 'Đăng nhập'}
        </button>
      </form>

      <p className="mt-6 px-4 text-center text-[13px] leading-relaxed text-ink-500">
        Mỗi người dùng một tài khoản riêng. Người tạo gia đình sẽ nhận được{' '}
        <b>mã mời 6 ký tự</b> để người kia tham gia cùng sổ.
      </p>
    </div>
  )
}

function translateAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/invalid login credentials/i.test(msg)) return 'Email hoặc mật khẩu không đúng'
  if (/user already registered/i.test(msg)) return 'Email này đã được đăng ký'
  if (/password should be at least/i.test(msg)) return 'Mật khẩu phải có ít nhất 6 ký tự'
  if (/email.*invalid|invalid.*email/i.test(msg)) return 'Email không hợp lệ'
  if (/rate limit|too many/i.test(msg)) return 'Thử lại sau ít phút nhé'
  return msg
}
