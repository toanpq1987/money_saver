export default function SetupNotice() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-5 p-6">
      <div className="text-5xl">🔌</div>
      <h1 className="text-2xl font-extrabold">Chưa kết nối Supabase</h1>
      <p className="text-[15px] leading-relaxed text-ink-500">
        App cần một dự án Supabase miễn phí để hai máy đồng bộ dữ liệu với nhau.
      </p>

      <ol className="space-y-3 text-[15px] leading-relaxed">
        {[
          <>
            Tạo dự án miễn phí tại <b>supabase.com</b>
          </>,
          <>
            Mở <b>SQL Editor</b> → dán toàn bộ nội dung file{' '}
            <code className="rounded bg-ink-200/70 px-1.5 py-0.5 text-[13px] dark:bg-white/10">
              supabase/schema.sql
            </code>{' '}
            → bấm Run
          </>,
          <>
            Vào <b>Project Settings → Data API</b> để lấy <b>Project URL</b>, và{' '}
            <b>API Keys</b> để lấy <b>anon public key</b>
          </>,
          <>
            Tạo file <code className="rounded bg-ink-200/70 px-1.5 py-0.5 text-[13px] dark:bg-white/10">.env</code>{' '}
            ở thư mục gốc (xem mẫu trong <code className="text-[13px]">.env.example</code>) rồi chạy
            lại <code className="text-[13px]">npm run dev</code>
          </>,
        ].map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      <p className="text-sm text-ink-500">
        Hướng dẫn đầy đủ nằm trong file <b>README.md</b> của dự án.
      </p>
    </div>
  )
}
