# Database

## Quy ước

Mỗi thay đổi database là **một file mới** trong `migrations/`, đặt tên
`<YYYYMMDDHHMMSS>_<mô-tả-ngắn>.sql`. Chạy theo thứ tự tên file.

**Không bao giờ sửa một file migration đã chạy trên database thật.** Sửa file cũ
thì cái database đã chạy nó rồi sẽ không nhận được thay đổi, mà nhìn vào repo
cũng không đoán được database đang ở trạng thái nào. Cần đổi gì thì thêm file mới.

Viết migration sao cho **chạy lại nhiều lần vẫn an toàn** — `create table if not
exists`, `create or replace function`, `drop policy if exists` trước khi
`create policy`. Lỡ tay chạy hai lần cũng không hỏng gì.

## Đã có những gì

| File | Nội dung |
|---|---|
| `20260801000000_initial_schema.sql` | Bảng, RLS, quyền truy cập, view số dư, RPC tạo/tham gia gia đình, bật realtime |
| `20260801010000_fix_invite_code_generation.sql` | Sửa `create_household`: đổi `gen_random_bytes()` (pgcrypto, không gọi được vì `search_path`) sang `gen_random_uuid()` |

## Chạy migration

### Cách 1 — dán tay vào dashboard

Supabase Dashboard → **SQL Editor** → **New query** → dán nội dung file → **Run**.

Chạy các file **theo đúng thứ tự tên**. Database đã chạy tới đâu rồi thì chỉ cần
chạy những file mới hơn.

### Cách 2 — Supabase CLI (khuyến nghị khi có nhiều file hơn)

```bash
npm install -D supabase
npx supabase login
npx supabase link --project-ref <project-ref-cua-ban>
npx supabase db push
```

CLI tự nhớ file nào đã chạy (bảng `supabase_migrations.schema_migrations`) nên
không bao giờ chạy trùng. `db push` lên project từ xa **không cần Docker** —
chỉ `supabase start` (dựng stack chạy máy local) mới cần.

Project ref là chuỗi trong địa chỉ API: `https://<project-ref>.supabase.co`.

## Thêm một thay đổi mới

```bash
npx supabase migration new them_cot_ghi_chu
```

Lệnh này tạo file rỗng có sẵn mốc thời gian trong `migrations/`. Viết SQL vào,
rồi `npx supabase db push`.

Không dùng CLI thì tự tạo file, đặt tên theo mốc thời gian hiện tại là được.
