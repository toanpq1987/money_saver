# 💰 MoneySaver — Sổ chi tiêu chung của hai vợ chồng

PWA cài lên iPhone như app thật. Hai máy dùng chung một sổ, đồng bộ tức thì,
**ghi được cả khi mất mạng**.

- **App:** https://money-saver-seven.vercel.app
- **Code:** https://github.com/toanpq1987/money_saver

---

## Mục lục

- [Khái niệm cần nắm: Ví và Tài khoản](#khái-niệm-cần-nắm-ví-và-tài-khoản)
- [Có gì trong app](#có-gì-trong-app)
- [Dùng hằng ngày](#dùng-hằng-ngày)
  - [Hai người cùng sửa một khoản](#hai-người-cùng-sửa-một-khoản)
- [Cài đặt từ đầu](#cài-đặt-từ-đầu)
- [Cài lên iPhone](#cài-lên-iphone)
- [Thêm người thứ hai vào sổ](#thêm-người-thứ-hai-vào-sổ)
- [Câu hỏi hay gặp](#câu-hỏi-hay-gặp)
- [Ghi chú kỹ thuật](#ghi-chú-kỹ-thuật)

---

## Khái niệm cần nắm: Ví và Tài khoản

Đây là thứ dễ nhầm nhất, nắm được cái này là hiểu cả app:

```
👨 Ví của tôi              ← VÍ = tầng gom, theo từng người
   💵 Tiền mặt             ← TÀI KHOẢN = nơi tiền thật sự nằm
   🏦 BIDV
   📱 Momo

👩 Ví của vợ
   💵 Tiền mặt
   🏦 Techcombank

🏠 Ví chung của gia đình
   💵 Tiền mặt
   💳 VPBank
```

Mỗi tài khoản khi tạo sẽ chọn **"Nằm trong ví"** nào. Ví được gom tự động theo
chủ sở hữu — không phải tạo ví thủ công.

Nhãn **"Ví của tôi"** là tương đối theo người đang đăng nhập: chồng thấy ví của
mình là "Ví của tôi", vợ thấy ví của vợ là "Ví của tôi".

> **Giới hạn:** cách gom này cho đúng 3 ví (mỗi người một ví + một ví chung).
> Muốn đặt thêm ví tự do kiểu "Ví du lịch" thì phải thêm bảng riêng và một
> migration.

---

## Có gì trong app

| Màn hình | Nội dung |
|---|---|
| **Tổng quan** | Số dư gia đình · **Ví của tôi** (số dư + vào/ra trong tháng) · tiến độ ngân sách · cân đối khoản chung · hoá đơn sắp đến hạn · giao dịch gần đây |
| **Giao dịch** | Nhập chi/thu/chuyển khoản, tìm kiếm, lọc theo loại · danh mục · chung/riêng |
| **Thống kê** | Chọn khoảng: tháng / 3 tháng / 6 tháng / năm / **toàn thời gian** · số dư hiện tại từng ví · xu hướng · chi theo ngày · cơ cấu danh mục · khoản chung vs riêng · ai chi nhiều hơn |
| **Tiết kiệm** | Quỹ mục tiêu có tiến độ & gợi ý gửi bao nhiêu mỗi tháng · sổ tiết kiệm ngân hàng (kỳ hạn, lãi suất, ngày đáo hạn, lãi dự kiến 3 kiểu trả lãi) |
| **Thêm** | Ngân sách · Ví & tài khoản · **Sao kê tài khoản** · Danh mục · **Nhật ký** · Vay & cho vay · Hoá đơn định kỳ · Gia đình · Cài đặt |

### Bốn tính năng đáng chú ý

**Tab riêng của từng người** — chip `Cả nhà / Ví của tôi / Ví của vợ` lọc mọi số
liệu. Mỗi giao dịch còn đánh dấu được là **khoản chung** (tính vào ngân sách và
chia đôi khi cân đối) hay **khoản riêng**.

**Sao kê tài khoản** — *Thêm → Sao kê tài khoản*. Mỗi tài khoản một thẻ: số dư
đầu kỳ, tiền vào, tiền ra, số dư cuối kỳ. Bấm vào để xem từng giao dịch kèm **số
dư luỹ kế**, đối chiếu thẳng với sao kê ngân hàng gửi về. Chọn được **ba kiểu
kỳ**: tròn tháng, **kỳ thẻ tín dụng** (VD ngày 24 tháng trước → 23 tháng này —
đúng cách VPBank chốt sổ), hoặc tự chọn hai đầu ngày.

**Ghi được khi mất mạng** — bấm Lưu là xong ngay, số liệu cập nhật liền kể cả số
dư. Giao dịch chưa gửi có nhãn *"chờ gửi"*; có mạng lại tự gửi đúng thứ tự. Tắt
app hay khởi động lại máy cũng không mất.

**Nhật ký** — *Thêm → Nhật ký*. Ai thêm, sửa, xoá gì, lúc mấy giờ, và với khoản
sửa thì ghi rõ **từ giá trị nào sang giá trị nào**. **Bấm một dòng là mở thẳng
khoản đó ra**; mỗi khoản còn có mã ngắn (`#6F9619`) hiện cả ở đây lẫn cuối form
sửa, để hai khoản giống hệt nhau vẫn phân biệt được. Xem [Hai người cùng sửa một
khoản](#hai-người-cùng-sửa-một-khoản) bên dưới.

### Tiện nhỏ

Gõ tắt số tiền (`50k`, `1,2tr`, `2ty`) · ẩn số dư một chạm · giao diện sáng/tối ·
xuất CSV mở bằng Excel · tạo ví/danh mục ngay trong form giao dịch.

---

## Dùng hằng ngày

### Mô hình tiền của nhà này

```
Lương chồng 30tr ──→ Ví của chồng
                       ├── 25tr ──→ Ví của vợ      (loại: Chuyển khoản)
                       └──  5tr  ──→ chi tiêu riêng
Lương vợ ─────────→ Ví của vợ ──→ chi cho vợ + gia đình
```

Mỗi tháng ghi 3 khoản:

| Việc | Loại | Ghi vào |
|---|---|---|
| Nhận lương 30tr | **Thu** | tài khoản trong Ví của chồng |
| Đưa vợ 25tr | **Chuyển** | từ tài khoản của chồng → tài khoản của vợ |
| Tiêu vặt | **Chi** | tài khoản của chồng, **gạt tắt** "khoản chung" |

Chuyển khoản không tính là thu hay chi, nên thống kê không bị đội số.

### Hai con số dễ nhầm

| | Ý nghĩa |
|---|---|
| **Số dư** (ở Ví & tài khoản, thẻ Ví của tôi) | Tiền thật đang có. Tích luỹ **toàn thời gian**, đã cộng dồn dư của các tháng trước |
| **Chênh lệch / Tháng này tăng-giảm** | Thu − chi **trong khoảng đang xem**. Âm không có nghĩa là hết tiền |

Ví dụ: ví còn **1.644.000 ₫** nhưng tháng này ghi *"Tháng này giảm 3.278.000 ₫"* →
ví vẫn còn tiền, chỉ là tháng này tiêu nhiều hơn thu.

### Nhớ gạt công tắc "khoản chung"

Trong form thêm giao dịch, công tắc **"Khoản chung của gia đình"** mặc định
**bật**. Khoản nào chi riêng (cà phê với bạn, đồ cá nhân…) thì gạt tắt — nếu
không, thống kê chung/riêng sẽ thấy 100% là khoản chung.

### Hai người cùng sửa một khoản

Hai vợ chồng cùng mở một giao dịch thì app xử lý thế này:

**Sửa hai ô khác nhau → cả hai cùng được giữ.** Vợ đổi số tiền, chồng đổi ghi
chú thì không ai đè ai, không có hộp thoại nào bật lên. App chỉ gửi đúng ô bạn
vừa sửa lên máy chủ chứ không gửi lại cả giao dịch.

**Sửa cùng một ô → app hỏi trước khi ghi đè.** Hộp thoại hiện rõ người kia vừa
đổi gì (*"Số tiền: 200.000 ₫ → 250.000 ₫"*) rồi để bạn chọn **Lấy bản của họ**
hoặc **Vẫn lưu đè**. App không tự quyết, vì chỉ bạn mới biết con số nào đúng.

**Người kia đã xoá khoản đó → app nói thật.** Trước đây app báo "Đã cập nhật"
trong khi chẳng ghi được gì; giờ nó hỏi bạn có muốn ghi lại thành khoản mới không.

**Ghi khi mất mạng thì ai gửi sau người đó thắng.** Cố tình để vậy: thao tác có
thể nằm trong hàng đợi cả ngày, hỏi bạn về một việc làm từ hôm qua thì rối hơn
là giúp. Bù lại, mọi thay đổi đều còn dấu vết trong **Nhật ký**.

Cần tra lại thì vào *Thêm → Nhật ký*: ai làm, lúc mấy giờ, đổi từ đâu sang đâu.

---

## Cài đặt từ đầu

*(Đã cài xong rồi thì bỏ qua phần này — chỉ cần khi dựng lại từ số 0.)*

### 1. Tạo dự án Supabase (miễn phí)

[supabase.com](https://supabase.com) → **New project**

- Region: **Southeast Asia (Singapore)**
- Lưu lại **Database Password**
- Giữ nguyên tick **"Automatically expose new tables"**

### 2. Chạy migration

**SQL Editor → New query** → chạy lần lượt các file trong
[`supabase/migrations/`](supabase/migrations/) **theo đúng thứ tự tên** → **Run**.

Kiểm chứng: mở **Table Editor**, phải thấy **12 bảng**.

> Muốn đổi database về sau thì **thêm file migration mới**, đừng sửa file cũ.
> Lý do và cách dùng Supabase CLI nằm trong
> [`supabase/README.md`](supabase/README.md).

### 3. Tắt xác nhận email

**Authentication → Sign In / Providers → Email** → tắt **Confirm email** → Save.

### 4. Trỏ Site URL về domain thật

**Authentication → URL Configuration**

- **Site URL**: `https://money-saver-seven.vercel.app`
- **Redirect URLs**: `https://money-saver-seven.vercel.app/**`

Không làm bước này thì link trong email (xác nhận, quên mật khẩu) sẽ trỏ về
`localhost:3000` và chết.

### 5. Lấy khoá kết nối

- **Project Settings → Data API** → **Project URL** *(chỉ lấy phần gốc, **không** kèm `/rest/v1/`)*
- **Project Settings → API Keys** → khoá **anon / public** *(bản mới gọi là **Publishable key**)*

🚫 Không bao giờ dùng `service_role` / `secret` — khoá đó bỏ qua toàn bộ bảo mật.

### 6. Chạy thử ở máy

Tạo `.env` cạnh `package.json` (mẫu ở [`.env.example`](.env.example)):

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

```bash
npm install
npm run dev
```

### 7. Deploy lên Vercel

[vercel.com](https://vercel.com) → **Add New → Project** → chọn repo → preset
**Vite** (tự nhận) → mở **Environment Variables** nhập 2 biến trên → **Deploy**.

> ⚠️ Vite nhúng biến môi trường vào lúc **build**. Sửa biến sau khi đã deploy thì
> **bắt buộc Redeploy**, không tự cập nhật.

---

## Cài lên iPhone

1. Mở link bằng **Safari** — bắt buộc. Chrome trên iOS không cài được, và cũng
   đừng mở từ link trong Zalo/Messenger.
2. Bấm **Chia sẻ** ⬆️ ở thanh dưới
3. Vuốt xuống → **Thêm vào MH chính**
4. **Thêm**

**Lần đầu mở từ icon sẽ phải đăng nhập lại** — iOS cho app một kho lưu trữ riêng,
tách khỏi Safari. Đăng nhập một lần rồi thôi.

**Cập nhật:** sau mỗi lần push code, đóng hẳn app (vuốt lên khỏi app switcher)
rồi mở lại.

---

## Thêm người thứ hai vào sổ

Cần **cả hai**: tài khoản riêng **và** mã mời.

**Người đã có sổ:** *Thêm → Gia đình* → **Chia sẻ** mã 6 ký tự.

**Người mới:**
1. Cài app trên máy mình
2. **Tạo tài khoản** bằng email **riêng**
3. Ở màn hình "Chào bạn 👋" chọn tab **"Có mã mời"** ⚠️ **không phải "Tạo sổ mới"**
4. Nhập mã → tên hiển thị → chọn vai trò → **Tham gia**

> ⚠️ Nếu lỡ bấm "Tạo sổ mới", tài khoản đó sẽ dính vào một sổ riêng và **không
> tham gia sổ chung được nữa**. Sửa bằng cách vào Supabase → **Table Editor →
> `profiles`** → đổi `household_id` của người đó thành `household_id` của bạn,
> rồi xoá household thừa.

Đừng dùng chung một tài khoản đăng nhập — app sẽ không phân biệt được ai chi
khoản nào, mọi tính năng theo người sẽ vô dụng.

Sau khi có 2 người, những thứ này tự hiện ra: thanh chip lọc theo người, mục "Ai
chi nhiều hơn", ô "Ai chi" trong form, thẻ "Cân đối khoản chung".

---

## Câu hỏi hay gặp

**Dữ liệu có mất không?** Không, nằm trên Supabase. Gỡ app hay đổi máy, đăng nhập
lại là còn nguyên. Thỉnh thoảng vào **Cài đặt → Xuất dữ liệu (CSV)** lưu một bản.

**Miễn phí đến bao giờ?** Supabase free cho 500MB — ghi vài chục năm chưa hết.
Lưu ý dự án free **ngủ đông sau 7 ngày không dùng**, mở app là chạy lại sau vài
giây.

**Số dư ví âm là sao?** Thẻ tín dụng đang nợ thì số dư âm — đúng bản chất.

**Sao kê tháng lệch với số dư ở trang Ví & tài khoản?** Nếu có giao dịch ghi
**ngày trong tương lai**: số dư tính cả nó, sao kê tháng thì không. Đúng theo
nguyên tắc sao kê.

**Đổi tiền tệ khác VNĐ?** Sửa `formatMoney` trong
[`src/lib/format.ts`](src/lib/format.ts).

**Thêm người thứ ba (ông bà, con)?** Cứ gửi mã mời, app hỗ trợ nhiều thành viên.

---

## Ghi chú kỹ thuật

**Stack:** React 18 · TypeScript · Vite 6 · Tailwind 3 · Supabase (Postgres +
Auth + Realtime) · `vite-plugin-pwa` · Recharts · TanStack Query · Zustand

**Bảo mật:** Row Level Security trên mọi bảng. Hàm `my_household_id()` khai báo
`SECURITY DEFINER` để policy của `profiles` không bị đệ quy vô hạn. Kèm `GRANT`
tường minh vì RLS quyết định thấy *dòng* nào, còn `GRANT` quyết định có được đụng
*bảng* hay không.

**Đồng bộ:** kênh realtime theo `household_id`. App tự tải lại khi quay lại từ
nền hoặc khi có mạng lại — iOS đóng băng WebSocket lúc app ở nền.

**Offline:** mọi thao tác ghi đi qua một hàng đợi (*outbox*) trong `localStorage`.
Id bản ghi sinh sẵn ở máy nên tạo rồi sửa tiếp khi offline vẫn trỏ đúng một dòng.
Lỗi mạng thì giữ lại thử sau, lỗi máy chủ từ chối thì bỏ qua để không kẹt hàng đợi.

**Màu biểu đồ** ([`src/lib/palette.ts`](src/lib/palette.ts)) đã qua công cụ
validate: độ sáng, độ bão hoà, phân biệt với người mù màu (protan/deutan/tritan),
tương phản với nền — ở **cả hai** chế độ sáng và tối. Bảng xếp hạng danh mục cố
tình **không dùng màu để phân biệt** (12 danh mục thì không bộ màu nào an toàn);
danh tính đến từ icon + tên ghi thẳng trên từng dòng.

### Lệnh

```bash
npm run dev        # chạy local (--host để mở từ điện thoại cùng wifi)
npm run build      # build production vào dist/
npm run preview    # xem thử bản build (có service worker)
npm test           # 23 test cho outbox offline + phép tính sao kê
npm run typecheck  # kiểm tra kiểu
npm run icons      # sinh lại icon PWA từ public/favicon.svg
```

### Thử chế độ offline

`npm run preview` (chế độ `dev` không bật service worker) → DevTools →
**Network → Offline** → ghi vài giao dịch → tắt Offline → xem chúng tự gửi lên.

### Việc còn để dành

Xem [`TODO.md`](TODO.md) — thông báo đẩy nhắc hoá đơn, khoá app bằng Face ID, và
vài ý tưởng khác.
