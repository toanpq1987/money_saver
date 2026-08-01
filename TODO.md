# Việc làm sau

Danh sách tính năng đã bàn nhưng chưa làm, kèm ghi chú kỹ thuật để lần sau bắt
tay vào là làm được ngay.

---

## 1. Thông báo đẩy nhắc hoá đơn đến hạn

**Vì sao cần:** hiện tại hoá đơn định kỳ chỉ nhắc khi mở app (màn hình Tổng
quan). Quên mở app là quên trả tiền nhà.

**Yêu cầu môi trường**
- iOS **16.4 trở lên**, và app **bắt buộc đã "Thêm vào MH chính"** — Safari
  thường không nhận được push.
- Phải chạy trên HTTPS (đã có sẵn khi deploy Vercel).
- Người dùng phải tự bấm cho phép; iOS chỉ hiện hộp thoại xin quyền khi bấm
  trực tiếp vào một nút, không xin được tự động lúc mở app.

**Cần làm**
- [ ] Sinh cặp khoá VAPID, cất khoá bí mật ở phía máy chủ
- [ ] Thêm nút "Bật nhắc hoá đơn" trong **Cài đặt** → gọi
      `Notification.requestPermission()` rồi `pushManager.subscribe()`
- [ ] Bảng `push_subscriptions` (endpoint, keys, profile_id, household_id) + RLS
- [ ] Supabase **Edge Function** chạy theo lịch (pg_cron gọi hàng ngày ~8h sáng):
      quét `recurring_bills` còn hạn ≤ 3 ngày và chưa có `last_paid_on` trong
      tháng → gửi Web Push
- [ ] Xử lý `push` + `notificationclick` trong service worker. Lưu ý:
      `vite-plugin-pwa` đang dùng chế độ `generateSW`, muốn thêm code riêng
      phải chuyển sang `injectManifest` và tự viết `src/sw.ts`
- [ ] Dọn subscription chết khi gửi trả về 404/410

**Bẫy hay gặp:** iOS thu hồi quyền nếu người dùng gỡ app khỏi màn hình chính;
cần kiểm tra lại subscription mỗi lần mở app.

---

## 2. Khoá app bằng Face ID / mã PIN

**Vì sao cần:** sổ tiền của cả nhà, đưa điện thoại cho người khác mượn là lộ hết.

**Cần làm**
- [ ] Bật/tắt trong **Cài đặt**, kèm chọn thời gian chờ (mở lại sau 1 phút thì
      chưa cần hỏi lại)
- [ ] Màn hình khoá phủ toàn bộ app, kích hoạt khi `visibilitychange` quay lại
- [ ] Face ID qua **WebAuthn**: đăng ký một passkey nội bộ
      (`navigator.credentials.create` với `authenticatorAttachment: 'platform'`,
      `userVerification: 'required'`), mở khoá bằng `navigator.credentials.get`
- [ ] **Bắt buộc có phương án dự phòng bằng mã PIN 6 số** — WebAuthn có thể
      không dùng được (máy cũ, người dùng tắt Face ID). Lưu mã đã băm
      (PBKDF2/Argon2) trong `localStorage`, tuyệt đối không lưu mã thô
- [ ] Giới hạn số lần nhập sai để tránh dò mã

**Lưu ý:** đây chỉ là khoá ở tầng giao diện, không mã hoá dữ liệu. Ai lấy được
tài khoản Supabase vẫn đọc được dữ liệu — muốn chặt hơn phải mã hoá đầu cuối,
việc đó lớn hơn nhiều.

---

## Ý tưởng khác (chưa ưu tiên)

- [ ] Chụp ảnh hoá đơn đính kèm giao dịch (Supabase Storage)
- [ ] Giao dịch định kỳ tự ghi (lương hàng tháng) thay vì phải bấm "Đã trả"
- [ ] Nhập nhanh từ tin nhắn biến động số dư ngân hàng (dán vào, tự tách số tiền)
- [ ] Báo cáo cuối tháng: so với tháng trước tiêu nhiều/ít hơn ở đâu
- [ ] Nhiều loại tiền tệ (khi đi du lịch nước ngoài)
- [ ] Widget iOS — **không làm được với PWA**, phải viết app native
