# CLAUDE.md — ngữ cảnh dự án

File này để Claude Code đọc đầu mỗi phiên. Ghi những thứ **không đọc ra được từ
code**: lý do đằng sau các quyết định, những cái bẫy đã vấp, và quy ước làm việc.

Tài liệu cho người dùng nằm ở [README.md](README.md). Database ở
[supabase/README.md](supabase/README.md). Việc chưa làm ở [TODO.md](TODO.md).

---

## Dự án là gì

PWA quản lý chi tiêu gia đình cho **hai vợ chồng** dùng chung, cài lên iPhone.
Toàn bộ giao diện **tiếng Việt**. Người dùng là chủ repo (`toanpq1987`), không
phải lập trình viên frontend — nên giải thích phải bằng ngôn ngữ đời thường,
tránh thuật ngữ khi không cần.

- Repo: https://github.com/toanpq1987/money_saver (nhánh `main`)
- App: https://money-saver-seven.vercel.app (Vercel tự deploy khi push `main`)
- Supabase: `https://oewagldewxuuscuugeji.supabase.co`
- Git identity đặt ở **phạm vi repo**, không đụng global.

## Mô hình tiền của gia đình này

Quan trọng — nhiều quyết định thiết kế xuất phát từ đây:

```
Lương chồng 30tr ──→ Ví của chồng
                       ├── 25tr ──→ Ví của vợ    (giao dịch loại "Chuyển")
                       └──  5tr  ──→ chi tiêu riêng của chồng
Lương vợ ─────────→ Ví của vợ ──→ chi cho vợ + gia đình
```

Chồng muốn theo dõi phần tiền riêng của mình **tách khỏi** tiền chung.

**Điểm mấu chốt:** phải tính theo **VÍ**, không theo **NGƯỜI CHI**. Sau khi
chuyển 25tr cho vợ thì số tiền đó không còn là của chồng nữa, dù `payer_id` vẫn
là chồng. Lọc theo `payer_id` sẽ trả lời sai.

---

## Cấu trúc

```
src/
  lib/
    supabase.ts     client + cờ isSupabaseConfigured
    types.ts        kiểu khớp với bảng database
    queries.ts      TOÀN BỘ truy vấn & mutation (TanStack Query) + realtime
    outbox.ts       hàng đợi ghi offline  ⭐ có test
    optimistic.ts   cập nhật cache ngay khi bấm Lưu
    wallets.ts      gom tài khoản thành "ví" theo chủ sở hữu
    palette.ts      màu biểu đồ đã qua validate mù màu
    format.ts       tiền VNĐ, ngày tháng, parse "50k"/"1,2tr"
    finance.ts      lãi sổ tiết kiệm
    patch.ts        so form với bản gốc, chỉ gửi ô đã đổi  ⭐ có test
    activity.ts     dịch nhật ký thô của database sang tiếng Việt
    errors.ts       đọc message từ lỗi Supabase (không phải Error) + ConflictError
    store.ts        Zustand: tháng đang xem, bộ lọc thành viên, theme
  hooks/
    useApp.tsx      context gốc: session, profile, household, members,
                    categories, accounts, balances
    useMonthData.ts số liệu theo khoảng thời gian + useWalletFlow
    useStatement.ts sao kê từng tài khoản  ⭐ có test
  components/       AppShell (nav, header, MemberTabs), ui.tsx (Sheet, toast,
                    confirm, MoneyInput), các *Sheet dùng chung
  pages/            5 tab chính + pages/more/* cho các trang con
supabase/migrations/  ĐÁNH SỐ, không sửa file đã chạy
```

---

## Quyết định thiết kế và lý do

**Ví là tầng gom, không phải tài khoản đơn lẻ.** `accounts.owner_id` chính là
khoá gom: cùng chủ = cùng ví, `owner_id` rỗng = ví chung. Không có bảng riêng cho
ví. Cho đúng 3 ví; muốn ví tự do ("Ví du lịch") thì phải thêm bảng + migration.
Ghi chú giới hạn này nằm trong `lib/wallets.ts`.

**Nhãn "Ví của tôi" là tương đối** theo người đang đăng nhập, và ví của chính
mình luôn xếp đầu danh sách.

**Bộ lọc cục bộ, không nhét vào store dùng chung.** Bộ lọc ví và khoảng thời gian
ở màn Thống kê là `useState` của riêng màn đó. Nếu để trong store, người dùng lọc
ở Thống kê rồi quên, sang Trang chủ thấy số sai mà không hiểu vì sao. Riêng
`month` và `member` thì dùng chung có chủ đích.

**Offline dùng outbox tự viết**, không dùng cơ chế pause mutation của React Query
— cần kiểm soát thứ tự và tự lưu xuống localStorage. Vì vậy mutation phải đặt
`networkMode: 'always'`, nếu không React Query treo mutation lúc offline và
`mutateAsync` không bao giờ trả về (nút Lưu quay mãi).

**Id bản ghi sinh ở máy khách** (`newId()` trong outbox.ts). Nhờ vậy tạo rồi sửa
tiếp khi offline vẫn trỏ đúng một dòng, khỏi phải ánh xạ id tạm → id thật.

**Phân biệt lỗi mạng với lỗi máy chủ.** Lỗi mạng → giữ lại thử sau. Máy chủ từ
chối → bỏ qua, vì thử lại vô ích mà lại **kẹt cứng cả hàng đợi phía sau**. Nhận
diện: lỗi Postgres luôn kèm `code`; `fetch` chết thì ném `TypeError` — Safari ghi
là `"Load failed"`.

**Biểu đồ không dùng màu để phân biệt danh mục.** 12 danh mục thì không bộ màu
nào qua được kiểm tra mù màu. Bảng xếp hạng dùng **một sắc độ đậm dần theo giá
trị**, danh tính đến từ icon + tên trên từng dòng. Chỉ biểu đồ 2 series
(Thu/Chi, Chồng/Vợ) mới dùng màu phân loại — cặp màu đó đã chạy validator và pass
ở cả hai chế độ sáng/tối. **Đừng đổi hex trong `palette.ts` nếu chưa chạy lại
validator** (skill `dataviz`, `scripts/validate_palette.js`).

**Xung đột sửa cùng lúc: khoá theo Ô, không khoá theo DÒNG.** Lúc Lưu, form so
với bản đọc được khi mở (`baseline`) và chỉ gửi những ô thật sự đổi
(`lib/patch.ts`), kèm điều kiện "các ô này vẫn đang giữ giá trị cũ"
(`OutboxOp.guard`). Nhờ vậy vợ sửa số tiền, chồng sửa ghi chú thì **cả hai cùng
được giữ**, không ai đè ai. Nếu khoá cả dòng bằng `updated_at` thì tình huống đó
vẫn bị chặn — hộp thoại bật lên vô cớ, vài lần là người dùng bấm "Vẫn lưu đè"
theo phản xạ và mọi thứ quay về chỗ cũ.

**`guard` không bao giờ được xuống hàng đợi offline** (`enqueue` gỡ nó ra). Thao
tác offline có thể nằm cả ngày; giữ guard thì đến lúc đẩy lên giá trị cũ chắc
chắn đã khác và lệnh nào cũng bị từ chối. Offline có chủ đích là "ai gửi sau thì
thắng", dấu vết vẫn còn đủ trong nhật ký.

**Update phải `.select()`.** PostgREST coi update trúng 0 dòng là **thành công**.
Không kiểm tra thì app báo "Đã lưu" trong khi bản ghi đã bị người kia xoá mất từ
đời nào. Trúng 0 dòng → `ConflictError`.

**Nhật ký ghi bằng trigger ở database, không ghi ở app.** Hai lý do: thao tác
đẩy lên từ hàng đợi offline cũng được ghi đầy đủ, và không thể sót do quên gọi
hàm log ở một nhánh code nào đó. Bảng chỉ cấp quyền `select` — người dùng không
xoá được dấu vết của chính mình.

**Số dư luôn là tích luỹ toàn thời gian**, tính từ view `v_account_balances`
(= `opening_balance` + mọi giao dịch). Khác hẳn "chênh lệch trong tháng". Đã
từng gọi nhầm số chênh lệch thành "Còn lại trong tháng" → người dùng đọc thành
"đang âm tiền" trong khi ví vẫn còn tiền. **Gọi đúng tên con số là việc quan
trọng, không phải chuyện chữ nghĩa vặt.**

---

## Bẫy đã vấp — đừng vấp lại

**pgcrypto không nằm trong `public` trên Supabase.** Hàm `SECURITY DEFINER` khai
báo `set search_path = public` sẽ không thấy `gen_random_bytes`. Dùng
`gen_random_uuid()` (có sẵn trong PostgreSQL core). Đây là lỗi khiến không ai tạo
được sổ gia đình.

**RLS không đủ, phải có `GRANT`.** RLS quyết định thấy *dòng* nào, `GRANT` quyết
định có được đụng *bảng* hay không. Thiếu `GRANT` → `permission denied for table`
dù policy viết đúng.

**Supabase không ném ra `Error`**, nó trả về object `{ message, code, details }`.
Viết `e instanceof Error ? e.message : String(e)` sẽ ra `"[object Object]"`. Luôn
dùng `errorMessage()` trong `lib/errors.ts`.

**Giao diện theo số thành viên.** `MemberTabs` ẩn khi `members.length < 2`; mục
"Ai chi nhiều hơn" và ô "Ai chi" cũng vậy; thẻ cân đối cần đúng 2 người. Khi
người dùng bảo "không thấy tính năng X", kiểm tra cái này trước khi nghĩ là bug.

**Sheet lồng sheet.** Chỉ sheet trên cùng nghe phím `Esc` (có stack trong
`ui.tsx`). `onClose` giữ trong ref vì nó là hàm inline, đổi tham chiếu mỗi lần
render.

**PowerShell + `git commit -m`.** Dấu nháy kép trong message làm PowerShell tách
nhầm tham số. **Luôn ghi message ra file rồi `git commit -F <file>`** (dùng thư
mục scratchpad).

**`git push` in ra `fatal: Cannot prompt`** — vô hại. Máy có 2 credential helper,
`manager` đòi bật cửa sổ nên báo lỗi, còn `store` đã cấp credential. Push vẫn
thành công; **luôn verify bằng `git ls-remote --heads origin`** rồi mới báo cáo.

**`Remove-Item` bị sandbox chặn** trong một số trường hợp. Xoá file thì dùng
Bash tool (`rm`).

---

## Quy ước

**Ngôn ngữ:** giao diện và tài liệu bằng tiếng Việt có dấu. **Comment trong code
và commit message viết tiếng Việt KHÔNG dấu** (tránh lỗi encoding trên Windows).

**Comment giải thích *tại sao*, không mô tả *cái gì*.** Ưu tiên ghi lại cái bẫy
và ràng buộc, vì đọc code là biết nó làm gì rồi.

**Commit:** tách theo từng việc, không gộp. Tiêu đề mô tả kết quả người dùng thấy
chứ không phải tên file đã sửa. Thân bài giải thích vấn đề và lý do chọn cách đó.
Kết thúc bằng `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

**Migration:** mỗi thay đổi database là **một file mới** trong
`supabase/migrations/`, đặt tên `<YYYYMMDDHHMMSS>_<mô-tả>.sql`. **Không bao giờ
sửa file đã chạy trên DB thật** — file `0001` có ghi cảnh báo ngay đầu. Viết sao
cho chạy lại nhiều lần vẫn an toàn.

**Trước khi push, luôn:** `npm run build` **và** `npm test`. Báo cáo trung thực —
nếu chưa kiểm chứng được phần nào thì nói rõ là chưa.

**Mỗi lần push là một lần tăng `version` trong `package.json`** (1.1.0 → 1.2.0),
gộp vào commit cuối của lần push đó. Số này hiện ở cuối trang "Thêm" cùng giờ
build — chủ repo nhìn vào đó để biết lần reload trên iPhone đã ăn bản mới chưa,
vì PWA trên iOS giữ bản cũ trong cache tới khi service worker cập nhật xong. Bỏ
qua bước này là người dùng hết cách phân biệt.

**Push chỉ khi được yêu cầu.** Sửa code xong thì tóm tắt rồi hỏi.

---

## Test

`npm test` — 39 test, chạy bằng Vitest (môi trường `node`, có
`src/test/setup.ts` giả lập `localStorage` và `navigator.onLine`).

- `src/lib/outbox.test.ts` — hàng đợi offline: thứ tự, mạng chập chờn, lỗi máy
  chủ bị loại bỏ, sống sót qua lần mở app mới, và phần chống ghi đè (guard được
  gắn vào lệnh, trúng 0 dòng thì báo xung đột, guard không xuống hàng đợi)
- `src/lib/patch.test.ts` — so form với bản gốc: numeric dạng chuỗi của Postgres,
  null vs undefined, ô bị xoá trắng, `false` không phải là "trống"
- `src/hooks/useStatement.test.ts` — phép tính sao kê: số dư đầu kỳ, cộng dồn,
  `đầu kỳ + vào − ra = cuối kỳ`, chuyển khoản hai chiều, thẻ tín dụng âm

Phần nào là **phép tính tiền** thì tách ra hàm thuần rồi viết test. Người dùng
đối chiếu sao kê với ngân hàng, sai một đồng là phiền.

---

## Trạng thái hiện tại

Đã xong và đang chạy thật: giao dịch, thống kê (có khoảng thời gian + toàn thời
gian), tiết kiệm, ngân sách, vay nợ, hoá đơn định kỳ, ví & tài khoản phân tầng,
sao kê tài khoản, ghi offline, PWA cài được trên iOS.

Tình huống lúc dừng phiên: chồng đã dùng thật, **vợ chưa tham gia sổ** — nên các
tính năng theo người vẫn đang ẩn.

Việc còn để dành trong [TODO.md](TODO.md): thông báo đẩy nhắc hoá đơn (cần VAPID
+ Edge Function + chuyển `vite-plugin-pwa` sang `injectManifest`), khoá app bằng
Face ID (WebAuthn + PIN dự phòng), và chuyển khoản định kỳ để khoản "đưa vợ 25tr"
mỗi tháng chỉ cần bấm một nút.
