# 💰 MoneySaver — Sổ chi tiêu chung của hai vợ chồng

Web app (PWA) cài được lên iPhone như app thật, hai máy dùng chung một sổ và
đồng bộ **ngay lập tức** với nhau.

---

## Có gì trong app

| Màn hình | Nội dung |
|---|---|
| **Tổng quan** | Số dư tất cả ví, thu/chi tháng, tiến độ ngân sách, cân đối khoản chung giữa vợ & chồng, hoá đơn sắp đến hạn, giao dịch gần đây |
| **Giao dịch** | Nhập nhanh chi/thu/chuyển ví, tìm kiếm, lọc theo loại · danh mục · chung/riêng, sửa & xoá |
| **Thống kê** | Xu hướng 6 tháng, chi tiêu theo từng ngày, cơ cấu chi theo danh mục, so sánh ai chi nhiều hơn, xem dạng bảng |
| **Tiết kiệm** | Quỹ mục tiêu (mua nhà, du lịch…) có tiến độ & gợi ý cần gửi bao nhiêu mỗi tháng · Sổ tiết kiệm ngân hàng có kỳ hạn, lãi suất, ngày đáo hạn, lãi dự kiến |
| **Thêm** | Ngân sách từng danh mục, ví & tài khoản, danh mục tuỳ chỉnh, vay & cho vay, hoá đơn định kỳ, thành viên & mã mời, cài đặt |

**Tab riêng của vợ và chồng**: thanh chip ở đầu màn hình — `Cả nhà` / `Chồng` /
`Vợ` — lọc mọi số liệu theo người chi. Mỗi giao dịch còn đánh dấu được là
**khoản chung** (tính vào ngân sách & chia đôi) hay **khoản riêng**.

Tính năng khác: gõ tắt số tiền (`50k`, `1,2tr`, `2ty`), ẩn số dư bằng một chạm,
giao diện sáng/tối, xuất CSV mở bằng Excel.

### Ghi được cả khi mất mạng

Đi chợ chỗ sóng yếu vẫn ghi chi tiêu bình thường:

- Bấm Lưu là **xong ngay**, số liệu cập nhật liền (kể cả số dư ví) — không chờ mạng
- Giao dịch chưa gửi được có nhãn **“chờ gửi”**, và một dải nhỏ phía dưới màn hình
  cho biết đang ngoại tuyến / còn bao nhiêu thay đổi chờ
- Có mạng lại là **tự gửi**, đúng thứ tự đã ghi, không cần làm gì
- Tắt app hay khởi động lại máy cũng không mất — hàng đợi nằm trong bộ nhớ máy
- Mở app khi không có mạng vẫn xem được số liệu của lần dùng gần nhất

Cách làm: mỗi thao tác ghi được xếp vào một hàng đợi (*outbox*) trong
`localStorage`, id bản ghi sinh sẵn ở máy nên tạo rồi sửa tiếp khi offline vẫn
trỏ đúng một dòng. Lỗi mạng thì giữ lại thử sau, lỗi do máy chủ từ chối thì bỏ
qua để không làm kẹt cả hàng đợi. Phần này có
[bộ test riêng](src/lib/outbox.test.ts) — chạy bằng `npm test`.

---

## Cài đặt — làm một lần, khoảng 10 phút

### Bước 1 — Tạo dự án Supabase (miễn phí)

1. Vào [supabase.com](https://supabase.com) → **Start your project** → đăng nhập bằng GitHub/Google.
2. **New project**. Đặt tên tuỳ ý, chọn region **Southeast Asia (Singapore)** cho nhanh.
3. Đặt **Database Password** và lưu lại (chỉ cần khi thao tác nâng cao).
4. Đợi ~2 phút cho dự án khởi tạo xong.

### Bước 2 — Tạo bảng dữ liệu

1. Trong dự án, mở **SQL Editor** (biểu tượng terminal ở cột trái) → **New query**.
2. Mở file [`supabase/schema.sql`](supabase/schema.sql) trong thư mục này, **copy toàn bộ** rồi dán vào.
3. Bấm **Run**. Thấy `Success. No rows returned` là xong.

> File này chạy lại nhiều lần cũng không sao, không làm mất dữ liệu cũ.

### Bước 3 — Tắt xác nhận email (tuỳ chọn, nên làm)

**Authentication → Sign In / Providers → Email** → tắt **Confirm email** → Save.
Không tắt cũng được, chỉ là mỗi người phải bấm link trong mail khi đăng ký.

### Bước 4 — Lấy khoá kết nối

- **Project Settings → Data API** → copy **Project URL**
- **Project Settings → API Keys** → copy **anon public** key

Tạo file `.env` ở thư mục gốc dự án (cạnh `package.json`):

```env
VITE_SUPABASE_URL=https://abcdxyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
```

> `anon key` là khoá công khai, để lộ cũng không sao — dữ liệu được bảo vệ bằng
> Row Level Security ở tầng database: mỗi người chỉ đọc/ghi được đúng dữ liệu
> gia đình mình.

### Bước 5 — Chạy thử trên máy

```bash
npm install
npm run dev
```

Mở địa chỉ hiện trong terminal. Đăng ký tài khoản → chọn **Tạo sổ mới** → xong.

---

## Đưa lên mạng để cài vào iPhone

iPhone chỉ cài được PWA khi trang chạy trên **HTTPS**, nên cần deploy. Vercel là
nhanh nhất và miễn phí:

```bash
npm install -g vercel
vercel
```

Làm theo hướng dẫn trên màn hình, rồi thêm 2 biến môi trường:

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod
```

Hoặc dễ hơn: đẩy code lên GitHub → vào [vercel.com](https://vercel.com) →
**Add New Project** → chọn repo → dán 2 biến môi trường vào mục
**Environment Variables** → **Deploy**.

Netlify, Cloudflare Pages cũng dùng được — file `vercel.json` và
`public/_redirects` đã cấu hình sẵn cho cả hai.

### Cài lên iPhone

1. Mở link vừa deploy bằng **Safari** (bắt buộc — Chrome trên iOS không cài được).
2. Bấm nút **Chia sẻ** ở thanh dưới.
3. Chọn **Thêm vào MH chính** → **Thêm**.
4. Icon xuất hiện ở màn hình chính, mở lên chạy toàn màn hình như app thường.

---

## Hai vợ chồng dùng chung sổ

1. **Người thứ nhất** đăng ký → **Tạo sổ mới** → điền tên gia đình, tên mình, chọn Chồng/Vợ.
2. Vào **Thêm → Gia đình**, bấm **Chia sẻ** để gửi **mã mời 6 ký tự** cho người kia.
3. **Người thứ hai** cài app trên máy mình, đăng ký tài khoản **riêng**, chọn
   **Có mã mời**, nhập mã → vào chung sổ.

Từ đó ai ghi gì máy kia cũng thấy ngay, không cần bấm làm mới.

---

## Câu hỏi hay gặp

**Dữ liệu có mất không?** Không. Toàn bộ nằm trên Supabase, gỡ app hay đổi điện
thoại đăng nhập lại là còn nguyên. Nên thỉnh thoảng vào **Cài đặt → Xuất dữ liệu
(CSV)** lưu một bản.

**Miễn phí đến bao giờ?** Gói free của Supabase cho 500MB database — một gia đình
ghi vài chục năm cũng chưa hết. Lưu ý: dự án free bị **tạm dừng nếu không dùng 7
ngày liên tục**, chỉ cần mở app là chạy lại (mất vài giây lần đầu).

**Muốn thêm người thứ ba (ông bà, con)?** Cứ gửi mã mời — app hỗ trợ nhiều thành
viên, mỗi người có tab lọc riêng.

**Đổi tiền tệ khác VNĐ?** Sửa hàm `formatMoney` trong
[`src/lib/format.ts`](src/lib/format.ts).

---

## Ghi chú kỹ thuật

- **React 18 + TypeScript + Vite 6 + Tailwind 3**, PWA qua `vite-plugin-pwa`
- **Supabase** cho auth, database (PostgreSQL) và realtime
- **Bảo mật**: Row Level Security trên mọi bảng; hàm `my_household_id()` khai báo
  `SECURITY DEFINER` để policy không bị đệ quy vô hạn
- **Đồng bộ**: kênh realtime theo `household_id`; app tự tải lại dữ liệu khi
  quay lại từ nền hoặc khi có mạng lại (iOS đóng băng WebSocket khi app ở nền)
- **Màu biểu đồ** trong `src/lib/palette.ts` đã được kiểm tra bằng công cụ
  validate: độ sáng, độ bão hoà, khả năng phân biệt với người mù màu
  (protan/deutan/tritan) và độ tương phản với nền — ở cả chế độ sáng lẫn tối.
  Bảng xếp hạng danh mục cố tình **không dùng màu để phân biệt danh mục** (12
  danh mục thì không bộ màu nào an toàn), danh tính đến từ icon + tên ghi thẳng
  trên từng dòng.

### Lệnh thường dùng

```bash
npm run dev        # chạy máy local (kèm --host để mở từ điện thoại cùng wifi)
npm run build      # build bản production vào dist/
npm run preview    # xem thử bản build
npm test           # chạy test cho phần đồng bộ offline
npm run icons      # sinh lại icon PWA từ public/favicon.svg
npm run typecheck  # kiểm tra kiểu
```

### Thử chế độ offline

Mở app bằng `npm run preview` (chế độ dev không bật service worker), rồi trong
DevTools chọn tab **Network → Offline**. Ghi vài giao dịch, tắt Offline đi và
xem chúng tự được gửi lên.
