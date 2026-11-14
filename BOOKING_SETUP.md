# Hướng dẫn vận hành tìm và đặt sân

## Chuẩn bị dữ liệu

Dữ liệu demo Thủ Đức–Dĩ An/Bình Dương và hai tài khoản thử đã có hướng dẫn riêng tại [DEMO_SETUP.md](DEMO_SETUP.md). Lệnh `seed:demo` bổ sung dữ liệu an toàn; lệnh `seed` cũ xóa database nên không dùng để cập nhật môi trường đang có dữ liệu.

1. Admin hoặc chủ sân tạo cụm sân, đặt trạng thái hoạt động và tạo ít nhất một sân nhỏ hoạt động. Backend sẽ sinh khung giờ theo giờ mở cửa, đóng cửa và thời lượng đã cấu hình.
   Khi đổi giờ mở/đóng cửa hoặc thời lượng, backend đồng bộ các ô giờ tương lai chưa đặt, giữ lại các ô đã đặt và tránh tạo giờ giao nhau. Không được thu hẹp giờ hoạt động vượt qua lịch đang đặt; cần xử lý các đơn liên quan trước.
2. Tìm theo khu vực, địa chỉ, tên, loại sân và khoảng giá hoạt động với dữ liệu sân hiện có. Tìm theo GPS chỉ hiển thị sân đã được nhập **cả vĩ độ và kinh độ** trong trang quản lý sân và còn ít nhất một ô giờ trống cho ngày được chọn. Dữ liệu sân cũ cần bổ sung tọa độ thật; hệ thống không tự suy đoán tọa độ từ địa chỉ.
3. Nút “Tìm sân gần tôi” cần trình duyệt hỗ trợ định vị và người dùng cho phép truy cập vị trí (trên website triển khai cần HTTPS; localhost được trình duyệt cho phép). Chọn ngày và bán kính để lọc. Vị trí được dùng trong request tìm sân.

## Gợi ý khu vực

- Mở bộ lọc, bấm ô **Khu vực** để xem gợi ý, hoặc nhập `thu duc`, `Q7`, `TPHCM`… Có thể bấm một dòng hoặc dùng phím lên/xuống và Enter. Chọn khu vực áp dụng ngay; nhập tự do rồi bấm **Áp dụng bộ lọc** vẫn hoạt động.
- Backend phục vụ `GET /api/courts/locations?q=thu%20duc&limit=8`. Gợi ý vùng mang `locationId`; giao diện gửi cùng mã này vào API danh sách sân để phân biệt các quận/huyện trùng tên ở tỉnh khác nhau. Chọn vùng sẽ tắt chế độ GPS hiện tại.
- Dữ liệu địa danh chạy cục bộ, không cần Google Maps API key. Quận/huyện cũ được ghi rõ trong gợi ý để phù hợp dữ liệu địa chỉ trước sắp xếp hành chính. Danh mục không phải bản đồ, không cung cấp mọi tên đường/địa điểm và không tự quy đổi ranh giới cũ/mới.
- Khi tạo sân, ghi đủ khu vực và tỉnh/thành trong `location` / `address` (có thể chia hai trường). Ví dụ `location: Hồ Chí Minh`, `address: 123 đường A, Thủ Đức`. Dữ liệu thiếu tỉnh/thành có thể không khớp một vùng được chọn; nhập tự do chỉ tên khu vực vẫn tìm được.
- Với phường/xã hiện hành, ghi rõ tiền tố trong địa chỉ, ví dụ `Phường Thủ Đức` hoặc `P. Thủ Đức`. Chọn phường mới không tự khớp địa chỉ chỉ ghi tên thành phố/quận cũ trùng tên; cần cập nhật địa chỉ hoặc tìm tự do nếu dữ liệu chưa đủ rõ.
- Gợi ý địa danh luôn có dù cơ sở dữ liệu chưa có sân. Kết quả tìm/đặt sân chỉ lấy sân đã nhập trong hệ thống; thêm cụm sân, sân con và lịch hoạt động trước khi kiểm thử đặt sân. Không chạy seed tùy tiện trên dữ liệu đang sử dụng.

## Quy trình đặt sân

- Khách đăng nhập, chọn ngày, sân nhỏ và ô giờ; hệ thống giữ ô giờ và tạo đơn `PENDING`. Giá dựa trên thời lượng ô giờ cộng 5% phí dịch vụ. Phương thức hiện hỗ trợ: **thanh toán tại sân**.
- Hai người đặt cùng slot chỉ một người giữ chỗ thành công. Người còn lại nhận `409 / SLOT_ALREADY_BOOKED`, thấy thông báo “Ô giờ này đã có người đặt”, lựa chọn cũ được xóa và giao diện tải lại lịch. Ô đã đặt bị vô hiệu hóa. Request key thành công phát lại cùng đơn; không tạo booking trùng.
- Admin vào quản lý booking, duyệt đơn để chuyển sang `CONFIRMED`. Sau khi thật sự thu tiền, admin chọn **Thu tiền** để ghi nhận `PAID`. Đơn đã xác nhận, đã thanh toán sẽ được hoàn tất tự động sau giờ chơi; sau đó khách có thể gửi đánh giá để admin duyệt.
- Khách tự hủy trước giờ chơi ít nhất 36 giờ; trường hợp khác liên hệ sân/admin. Hủy đơn đã thu tiền chuyển sang `REFUND_PENDING`, chưa tự hoàn tiền. Sau khi hoàn trả thực tế, admin bấm **Xác nhận đã hoàn tiền** để ghi nhận `REFUNDED`, người xác nhận và thời gian.
- Đơn chưa được duyệt khi tới giờ chơi được hủy tự động; đơn đã xác nhận nhưng chưa thu tiền không tự chuyển thành đã thanh toán.
- Thuê dụng cụ, coupon, điểm thưởng, giao hàng, bảo trì và thanh toán online đang phát triển. Các API tương ứng trả `501 FEATURE_IN_DEVELOPMENT`; dữ liệu cũ vẫn được giữ. Không dùng giao diện hoặc API thanh toán online cũ để thu tiền thật.

## Email nhắc trước giờ chơi

Backend quét khoảng mỗi phút và gửi email tới địa chỉ tài khoản đặt sân khi đơn đã `CONFIRMED` và còn tối đa 30 phút trước giờ bắt đầu, theo múi giờ Việt Nam. Đơn tạo hoặc xác nhận sát giờ sẽ được nhắc ở lần quét tiếp theo nếu giờ chơi chưa bắt đầu. Cần chạy backend liên tục và cấu hình Gmail SMTP thật trong `backend/.env`:

```dotenv
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=your-gmail@gmail.com
MAIL_PASSWORD=your-gmail-app-password
```

Dùng App Password hợp lệ của tài khoản Gmail được phép gửi SMTP; không đưa mật khẩu vào Git. Xem thêm [AUTH_SETUP.md](AUTH_SETUP.md). Email OTP và email nhắc cùng dùng cấu hình SMTP. Nếu gửi thất bại, backend ghi log và thử lại sau khoảng hai phút cho tới giờ chơi. Các lần gửi có thể trễ do thời điểm quét hoặc nhà cung cấp email; nếu server dừng sau khi SMTP nhận thư nhưng trước khi ghi kết quả, có thể gửi lại một lần. Nếu backend dừng qua cả giờ chơi, lịch nhắc đó sẽ không được gửi bù.

## API và kiểm thử

- `GET /api/courts?location=binh%20thanh&search=...&type=INDOOR&minPrice=0&maxPrice=200000&date=2026-12-01&page=1&limit=6`; có `date` sẽ lọc sân còn ô giờ trống tương lai trước khi phân trang.
- `GET /api/courts/nearby?lat=10.7769&lng=106.7009&radius=5&date=2026-12-01` hỗ trợ thêm các bộ lọc như danh sách sân; khoảng cách tính bằng km, kết quả sắp xếp theo khoảng cách. Chỉ sân có tọa độ và ô giờ tương lai chưa đặt mới được trả về. Tìm theo khoảng cách hiện quét các sân có tọa độ, phù hợp tập dữ liệu nhỏ; khi mở rộng cần chỉ mục địa lý và truy vấn phía MongoDB.
- `GET /api/courts/:id?date=YYYY-MM-DD`: thông tin sân và lịch sân nhỏ.
- `POST /api/bookings`: cần access token, body `{ "slotId": "...", "paymentMethod": "CASH", "note": "", "requestKey": "UUID-cua-yeu-cau" }`. `requestKey` tùy chọn, 16–100 ký tự chữ/số/`_`/`-`; giao diện tự tạo và dùng lại khi thử lại để tránh tạo trùng đơn. Xem lịch bằng `GET /api/bookings/my-bookings` và hủy bằng `PUT /api/bookings/:id/cancel`.
- Admin: `PUT /api/admin/bookings/:id/confirm`, `PUT /api/admin/bookings/:id/cash-payment`, `PUT /api/admin/bookings/:id/cancel`, `PUT /api/admin/bookings/:id/complete`, `PUT /api/admin/bookings/:id/refund`.
- Swagger hiện mô tả các route sân đã được bổ sung annotation, tại `http://localhost:5001/api-docs` khi chạy Docker; không mặc định coi đó là danh sách đầy đủ toàn bộ API.
- Chạy `npm test` trong `backend/`; kiểm thử tích hợp MongoDB bằng `npm run test:integration`. Kiểm thử tích hợp tạo và xóa một database kiểm thử có tên ngẫu nhiên trên MongoDB tại `localhost:27018`, không dùng tài khoản hoặc gửi email thật.

MongoDB Compose đang chạy dạng standalone. Luồng mới tạo yêu cầu `PREPARING` trước khi giữ ô giờ, sau đó chuyển `COMMITTED`. Yêu cầu dở dang hết hạn sau hai phút và được đối soát mỗi phút; slot chỉ được nhả nếu vẫn thuộc đúng đơn bị hủy. Cơ chế này áp dụng cho đơn mới; slot lỗi từ phiên bản cũ không có booking liên kết cần kiểm tra riêng. Scheduler đồng bộ lịch theo hàng đợi trong một tiến trình: trước khi chạy nhiều backend replica, cần bổ sung khóa phân tán hoặc transaction MongoDB replica set cho việc đổi cấu hình lịch.

Danh sách API được giữ và tạm ngừng: [API_STATUS.md](API_STATUS.md). Kiểm thử dùng SMTP/Google giả lập; cần kiểm thử gửi thư và đăng nhập Google thực tế sau khi cấu hình tài khoản triển khai.
