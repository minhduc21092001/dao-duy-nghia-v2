# Thiệp cưới Duy Nghĩa & Thanh Hà — mẫu Minimalism Đỏ Đậm

Bản dựng lại [mẫu Minimalism Đỏ Đậm của Chung Đôi](https://chungdoi.com/vi/mau-thiep/minimalism-do-dam/demo) dưới dạng website tĩnh. Bạn sửa nội dung trong **một file Markdown**, thay ảnh trong **thư mục `anh/`**, chạy một lệnh là có website để đăng.

## Cấu trúc thư mục

```
minimalism-do-dam/
├── noi-dung.md            ← ✏️ TOÀN BỘ CHỮ TRÊN THIỆP (tên, ngày, địa chỉ, tài khoản, album…)
├── anh/                   ← 🖼️ ẢNH
│   ├── anh-cuoi/          ảnh trong phong thư ở đầu thiệp
│   ├── album/             ảnh của phần "Album Ảnh", 01.jpg, 02.jpg… theo thứ tự
│   ├── mung-cuoi/         ảnh QR ngân hàng (chú rể, cô dâu)
│   ├── chia-se/           ảnh hiện khi gửi link qua Zalo/Messenger (ảnh NGANG 1200×630, thấy rõ mặt)
│   └── trang-tri/         hoa, phong thư, nền giấy, lâu đài, biểu tượng lịch trình… (ít khi cần đổi)
├── nhac/nhac-nen.mp3      ← 🎵 nhạc nền
├── anh-goc/               ← ảnh gốc từ studio (chỉ để trên máy, KHÔNG đưa lên mạng)
├── google-sheet/          ← lưu xác nhận tham dự + lời chúc vào Google Sheet (xem HUONG-DAN.md trong đó)
├── src/                   ← khung thiệp (HTML/CSS/JS, phông chữ). Không cần sửa.
│   ├── thiep.html         khung trang thiệp, các chỗ {{…}} lấy chữ từ noi-dung.md
│   ├── tao-link.html      trang tạo link riêng cho từng khách
│   ├── thong-ke.html      trang thống kê xác nhận tham dự (/nha-trai/thong-ke/, /nha-gai/thong-ke/)
│   └── css/  js/  fonts/
├── worker/index.mjs       ← Cloudflare Worker: link ngắn, xác nhận tham dự, thống kê
├── wrangler.jsonc         ← cấu hình Cloudflare Worker (tên, thư mục website/, KV)
├── chung/                 ← mã link ngắn + xác nhận tham dự dùng chung cho Cloudflare và máy chủ xem thử
├── build.js               ← ghép noi-dung.md + ảnh + khung → thư mục website/
├── website/               ← KẾT QUẢ để đăng lên mạng (tự tạo, đừng sửa tay)
└── _ban-cu-codex/         ← bản clone cũ (trước khi cấu trúc lại), giữ để đối chiếu — xoá được khi không cần
```

Ảnh/nhạc có mặt cả ở `anh/` lẫn `website/anh/` — `website/` là bản thành phẩm, mỗi lần build tự chép lại.

## Cần có

[Node.js](https://nodejs.org) bản 18 trở lên. Xem thử trên máy không cần cài thêm gì.

## Sửa thiệp

1. Mở terminal trong thư mục này, chạy:

   ```
   npm run dev
   ```

2. Mở <http://localhost:8080/nha-trai/> (thiệp nhà trai) hoặc <http://localhost:8080/nha-gai/> (thiệp nhà gái). Trang tạo link: `/nha-trai/tao-link/`, `/nha-gai/tao-link/`.
   (Máy đang có chương trình khác dùng cổng 8080 thì chạy `set PORT=8090 && npm run dev` rồi mở `localhost:8090`.)
3. Sửa `noi-dung.md` hoặc chép ảnh mới vào `anh/`, lưu lại rồi **tải lại trang** là thấy thay đổi.

**Ngày cưới:** chỉ cần sửa `Ngày cưới` ở mục 4 (`2026-11-28`) — thứ, ngày/tháng/năm, lịch tháng có trái tim, ngày trên phong thư, đếm ngược và nút "Thêm vào lịch" đều tự cập nhật. Riêng `Ngày âm lịch` phải tự gõ.

**Đổi ảnh:** chép ảnh đè lên file cũ, **giữ nguyên tên file** (ví dụ thay `anh/album/05.jpg`). Muốn thêm/bớt ảnh album thì thêm/xoá dòng `Album ảnh NN` ở mục 5. Ảnh máy ảnh rất nặng (~20 MB) — nên thu nhỏ về khoảng 1000×1500 trước khi đưa vào `anh/` để thiệp tải nhanh.

**Ẩn bớt phần:** mục 14 trong `noi-dung.md`, ghi `không` cho phần muốn ẩn (album, xác nhận tham dự, bản đồ, dress code, lịch trình, sổ lưu bút, hộp quà).

**Tài khoản mừng cưới:** QR hiện tại là **QR DEMO** (không chuyển tiền được). Chép ảnh QR thật vào `anh/mung-cuoi/` (tên `qr-chu-re.png`, `qr-co-dau.png`) và điền đúng ngân hàng, số tài khoản, chủ tài khoản ở mục 11. Quét thử bằng app ngân hàng trước khi gửi thiệp.

**Xác nhận tham dự:** cả hai thiệp có nút "Xác nhận tham dự" (khách chọn đến/không đến + số người; mở bằng link riêng thì tên điền sẵn). Kết quả lưu trên Cloudflare, mỗi bên xem riêng ở **`…/nha-trai/thong-ke/`** và **`…/nha-gai/thong-ke/`** (`…/thong-ke/` chỉ để chọn bên): số người sẽ đến, số khách đến / không đến, danh sách từng khách (tên, số người, đến hay không, thời gian), tìm theo tên, tải file Excel (CSV), xoá mục thử. Khách gửi lại (cùng tên) thì lần mới ghi đè lần cũ: danh sách và số liệu luôn theo lần điền gần nhất. Khi xem thử trên máy: <http://localhost:8080/nha-trai/thong-ke/> (không cần mật khẩu, dữ liệu nằm trong `xac-nhan.local.json`).

**Sổ lưu bút:** làm theo `google-sheet/HUONG-DAN.md` để lời chúc gửi về Google Sheet của bạn (xác nhận tham dự cũng được chép thêm vào Sheet nếu có). Chưa làm thì khách vẫn bấm gửi được nhưng lời chúc không được lưu.

## Hai bản thiệp: nhà trai và nhà gái

- `…/nha-trai/`: dùng toàn bộ nội dung trong `noi-dung.md`. Trang chủ `…/` cũng hiện thiệp nhà trai.
- `…/nha-gai/`: giống thiệp nhà trai, trừ các dòng `Nhà gái - …` đã điền ở **mục 16** (ngày, giờ, nơi tổ chức tiệc, bản đồ, lịch trình…). Dòng để trống thì dùng giống nhà trai. Khi build, dòng `ℹ️ Thiệp nhà gái chưa điền…` liệt kê những mục còn trống.

## Tạo link cho khách

Khách nhà trai: mở `…/nha-trai/tao-link/`. Khách nhà gái: mở `…/nha-gai/tao-link/` (`…/tao-link/` cũ tự chuyển sang trang nhà trai). Link tạo ở trang nào thì mở thiệp của bên đó.

Trên trang tạo link, gõ **một ô duy nhất: Người nhận**, rồi bấm **Tạo link**:

- Ví dụ gõ "Anh Đức và người thương" ở trang nhà trai → link ngắn `https://ten-mien/nha-trai/anh-duc-va-nguoi-thuong`.
- Khi gửi qua Zalo/Messenger, khung xem trước hiện "💍 Thiệp cưới Duy Nghĩa & Thanh Hà 💕" và dòng dưới "**Mời** Anh Đức và người thương".
- Trên thiệp, tên đó hiện ngay dưới chữ "Thân Mời" ở phong thư.
- Link vừa tạo tự lưu vào danh sách bên dưới (chỉ trên trình duyệt bạn đang dùng, mỗi bên một danh sách).

Link ngắn chạy nhờ Cloudflare Worker (`worker/index.mjs`), lưu trong **Cloudflare KV**. Cần deploy qua Git hoặc `npm run deploy` (bên dưới). Kéo thả thư mục `website/` trên trang Cloudflare thì không có chức năng này: trang tạo link sẽ tạm dùng link dài `?khach=...`.

## Đăng lên mạng (Cloudflare Workers)

Thiệp chạy dưới dạng **Cloudflare Worker** (cấu hình trong `wrangler.jsonc`): file tĩnh trong `website/` do Cloudflare trả thẳng, còn link ngắn, xác nhận tham dự, thống kê do `worker/index.mjs` xử lý, lưu trong **Cloudflare KV** (binding `LIEN_KET`, lần deploy đầu Wrangler tự tạo).

**Qua GitHub (đang dùng, đẩy code là tự cập nhật):** Cloudflare → *Workers & Pages* → Worker `duy-nghia-thanh-ha` → *Settings → Build*:
- *Build command*: `node build.js`
- *Deploy command*: `npx wrangler deploy` (không thêm tham số, mọi cài đặt nằm trong `wrangler.jsonc`)

**Từ máy, không cần GitHub:** `npm run deploy` (lần đầu mở trình duyệt để đăng nhập Cloudflare).

**Mật khẩu** — Worker → *Settings → Variables and Secrets → Add*, chọn loại **Secret** (loại *Text* sẽ bị xoá mỗi lần deploy):
- `MAT_KHAU_THONG_KE` (tuỳ chọn): không đặt thì trang thống kê mở không cần mật khẩu — ai biết địa chỉ `/nha-trai/thong-ke/`, `/nha-gai/thong-ke/` cũng xem và xoá được. Muốn mỗi bên một mật khẩu thì đặt `MAT_KHAU_THONG_KE_NHA_TRAI` và/hoặc `MAT_KHAU_THONG_KE_NHA_GAI`.
- `MAT_KHAU_TAO_LINK` (tuỳ chọn): chỉ người biết mới tạo được link.

**Địa chỉ website** ở mục 15 trong `noi-dung.md` phải đúng địa chỉ thật (hiện là `https://duy-nghia-thanh-ha.thiepcuoionline.workers.dev`), đổi tên miền thì sửa lại — **ảnh xem trước khi gửi link chỉ hiện khi địa chỉ này đúng**. Thử bằng một **link mới** (Zalo/Messenger nhớ khung xem trước cũ của link đã gửi).

**Thử y như trên Cloudflare (tuỳ chọn):** `npm run cf-dev` → `http://localhost:8788`. Còn `npm run dev` vẫn là cách xem thử nhanh nhất khi sửa nội dung.

## Khác với mẫu gốc

- Bỏ: chữ ký/biểu tượng Chung Đôi, widget chat hỗ trợ, mã thanh toán và theo dõi của trang gốc, 10 lời chúc mẫu (tên người lạ) trong sổ lưu bút.
- Thêm: tên khách trên phong thư theo link riêng; xác nhận tham dự và lời chúc gửi về Google Sheet; nhạc thử tự phát ngay khi mở (trình duyệt chặn thì phát khi khách bấm "Mở thiệp").
- Bản đồ dùng khung Google Maps nhúng không cần API key.
- Nhạc nền hiện là bài "Em đồng ý (I do)" lấy từ mẫu; thay file `nhac/nhac-nen.mp3` nếu muốn bài khác.
