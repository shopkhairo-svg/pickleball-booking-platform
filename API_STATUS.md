# Phạm vi API sau khi tinh gọn

Cập nhật theo các route đang đăng ký trong mã nguồn. Mọi đường dẫn trong bảng bên dưới có tiền tố **`/api`**. Các API yêu cầu đăng nhập dùng `Authorization: Bearer <accessToken>`, trừ luồng thông báo SSE được ghi riêng.

Phạm vi đang vận hành: tài khoản, tìm sân theo khu vực/GPS, lịch sân con, đặt và hủy sân, thu tiền tại sân, ghi nhận hoàn tiền, đánh giá, yêu thích, xem gần đây, thông báo, quản trị sân và người dùng. Luồng giao hàng, nhân viên bảo trì, dụng cụ, nhập kho, coupon, điểm thưởng và thanh toán online đã ngắt ở router. Mã nghiệp vụ và dữ liệu lịch sử vẫn được giữ để phát triển sau; chúng không được xem là chức năng đang hoạt động.

## API được giữ

### Tài khoản và hồ sơ

Nguồn: [auth.routes.js](backend/src/routes/auth.routes.js), [user.routes.js](backend/src/routes/user.routes.js).

| Method | Đường dẫn | Quyền và chức năng |
| --- | --- | --- |
| POST | `/auth/register` | Công khai; nhận `fullName`, `email`, `password`, gửi OTP |
| POST | `/auth/verify-otp` | Công khai; xác nhận `email`, `otpCode` để tạo tài khoản |
| POST | `/auth/login` | Công khai; đăng nhập bằng email/mật khẩu |
| POST | `/auth/google-login` | Công khai; xác minh Google **ID token** trong `idToken` |
| POST | `/auth/forgot-password` | Công khai; gửi mã khôi phục |
| PUT | `/auth/reset-password` | Công khai; kiểm tra OTP và đổi mật khẩu |
| POST | `/auth/refresh-token` | Cần refresh token hợp lệ |
| POST | `/auth/logout` | Đã đăng nhập; thu hồi phiên |
| GET, PUT | `/users/profile` | Đã đăng nhập; xem/sửa hồ sơ, tùy chọn upload avatar |

Tên đúng là `/auth/google-login`; không có `/auth/goole-login`. OTP thành công không tự cấp phiên đăng nhập. Quyền và trạng thái tài khoản được kiểm tra lại khi xác thực access token, nên khóa tài khoản hoặc đổi vai trò có hiệu lực với các request tiếp theo.

### Tìm sân, lịch sân và tương tác

Nguồn: [court.routes.js](backend/src/routes/court.routes.js), [court.service.js](backend/src/services/court.service.js).

| Method | Đường dẫn | Quyền và chức năng |
| --- | --- | --- |
| GET | `/courts` | Công khai; tìm sân, bộ lọc và phân trang |
| GET | `/courts/locations` | Công khai; gợi ý khu vực Việt Nam và địa chỉ sân đang hoạt động theo `q`, `limit` (1–15) |
| GET | `/courts/nearby` | Công khai; tìm theo tọa độ, khoảng cách và ngày |
| GET | `/courts/:id` | Công khai; chi tiết cụm sân và khung giờ sân con theo `date` |
| GET | `/courts/:courtId/similar` | Công khai; sân tương tự |
| GET | `/courts/me/recently-viewed` | Người dùng hoặc khách với định danh khách hợp lệ |
| POST | `/courts/:courtId/view` | Ghi nhận lượt xem của người dùng/khách |
| GET | `/courts/me/favorites` | Đã đăng nhập; danh sách yêu thích |
| GET, POST | `/courts/:courtId/favorite` | Đã đăng nhập; xem hoặc bật/tắt yêu thích |

- Danh sách hỗ trợ `search`, `location`, `locationId`, `type`, `minPrice`, `maxPrice`, `date`, `page`, `limit`. Từ khóa hỗ trợ tiếng Việt không dấu và ký tự đặc biệt được xử lý như văn bản. Khi truyền ngày, chỉ trả sân có ô giờ tương lai còn trống tại sân con đang hoạt động.
- Ô khu vực có gợi ý khi bấm vào hoặc nhập chữ; chọn gợi ý sẽ lọc ngay và về trang 1. `locationId` lấy từ gợi ý vùng, ưu tiên hơn nhãn `location` và kiểm tra cả tỉnh/thành để phân biệt địa danh trùng tên. Nhập tự do vẫn được hỗ trợ; `Q7`, `Q.7`, `TPHCM`, `HN` được nhận diện. Sửa nội dung tự do sẽ bỏ mã vùng cũ khi áp dụng.
- Gợi ý địa danh dùng danh mục cục bộ có [nguồn và giấy phép](backend/src/data/README.md), gồm tỉnh/thành và phường/xã hiện hành cùng quận/huyện theo địa chỉ cũ được ghi rõ. Gợi ý địa chỉ sân chỉ lấy sân `AVAILABLE`. Địa danh xuất hiện trong gợi ý không đồng nghĩa đã có sân đặt được tại đó. Không tích hợp Google Places, không cần Maps API key, không tự tải sân hoặc địa chỉ từ Google Maps.
- Tìm gần hỗ trợ thêm `lat`, `lng`, `radius` theo km; mặc định bán kính 5 km, tối đa 100 km. Kết quả sắp theo khoảng cách, lọc ô giờ trống trước khi phân trang. Sân cần có tọa độ thật; không tự suy đoán tọa độ từ địa chỉ.
- “Đã xem gần đây” là lịch sử xem; “sân gần tôi” là tìm theo vị trí. Đây là hai luồng độc lập.

### Đặt sân và thanh toán tại sân

Nguồn: [booking.routes.js](backend/src/routes/booking.routes.js), [createBooking.service.js](backend/src/services/createBooking.service.js), [bookingLifecycle.service.js](backend/src/services/bookingLifecycle.service.js).

| Method | Đường dẫn | Quyền và chức năng |
| --- | --- | --- |
| POST | `/bookings` | Đã đăng nhập; đặt bằng `slotId`, `paymentMethod: "CASH"`, tùy chọn `note`, `requestKey` |
| GET | `/bookings/my-bookings` | Lịch sử của chính người dùng |
| PUT | `/bookings/:id/cancel` | Hủy đơn của chính người dùng theo chính sách thời gian |

Đơn mới có trạng thái `PENDING`, chưa thanh toán. Giá dựa trên thời lượng thực của ô giờ và 5% phí hệ thống. Giữ ô giờ bằng thao tác có điều kiện; `requestKey` giúp nhận lại kết quả của cùng yêu cầu thay vì tạo thêm đơn. Có cơ chế thu hồi yêu cầu giữ chỗ chưa hoàn tất và giải phóng slot thuộc đơn đã hủy; MongoDB standalone chưa cung cấp transaction cho toàn bộ quy trình.

Đặt trùng slot trả `409 / SLOT_ALREADY_BOOKED`; slot bị xóa/đổi lịch trả `409 / SLOT_UNAVAILABLE`. Frontend đóng xác nhận cũ, bỏ slot đã chọn, hiển thị thông báo và tải lại lịch. Các mã này được giữ nguyên khi backend hoàn tác intent thất bại.

Admin xác nhận đơn trước giờ bắt đầu; sau khi thực sự thu đủ tiền, ghi nhận `PAID`. Đơn `CONFIRMED` và `PAID` chỉ hoàn tất sau giờ kết thúc. Đơn chờ duyệt đã tới giờ chơi sẽ bị hủy khi tiến trình dọn lịch chạy. Khách được tự hủy trước giờ chơi ít nhất 36 giờ; trường hợp khác liên hệ admin.

Hủy đơn đã thu tiền chuyển sang `REFUND_PENDING`. Admin tự hoàn tiền cho khách rồi mới gọi API ghi nhận hoàn tiền để chuyển `REFUNDED`. Website không tự chuyển tiền, không tự kiểm tra giao dịch ngân hàng và không cam kết hoàn tiền trong 24 giờ.

### Đánh giá và thông báo

Nguồn: [review.routes.js](backend/src/routes/review.routes.js), [notification.routes.js](backend/src/routes/notification.routes.js).

| Method | Đường dẫn | Quyền và chức năng |
| --- | --- | --- |
| GET | `/reviews/courts/:courtId` | Công khai; đánh giá đã duyệt |
| GET | `/reviews/courts/:courtId/eligibility` | Đã đăng nhập; kiểm tra đơn đủ điều kiện đánh giá |
| POST | `/reviews` | Đã đăng nhập; đánh giá đơn đã hoàn tất và thanh toán, tùy chọn ảnh |
| GET | `/reviews/my-booking/:bookingId` | Đánh giá của chính người dùng theo booking |
| GET | `/reviews/admin` | ADMIN; danh sách kiểm duyệt |
| PUT | `/reviews/admin/:id/status` | ADMIN; cập nhật trạng thái kiểm duyệt |
| GET | `/notifications` | Danh sách thông báo của chính người dùng |
| GET | `/notifications/stream` | SSE realtime; access token trong query `token` theo hợp đồng hiện tại |
| PUT | `/notifications/read-all` | Đánh dấu tất cả thông báo của mình đã đọc |
| PUT | `/notifications/:id/read` | Đánh dấu một thông báo của mình đã đọc |
| DELETE | `/notifications/:id` | Xóa một thông báo của mình |

Email nhắc lịch do [bookingReminder.service.js](backend/src/services/bookingReminder.service.js) chạy nền, không có API công khai để ép gửi. Backend quét khoảng mỗi phút, chỉ gửi cho đơn đã xác nhận, chưa gửi nhắc và còn tối đa 30 phút trước giờ chơi. Gửi tới email tài khoản đặt sân; lỗi SMTP được thử lại trước giờ bắt đầu. Có lưu claim/lease để hạn chế nhiều tiến trình cùng gửi. Vẫn có thể gửi trùng nếu SMTP đã nhận thư nhưng tiến trình dừng trước khi ghi nhận kết quả.

### Quản trị viên

Toàn bộ API còn hoạt động dưới đây yêu cầu **ADMIN**. Nguồn: [admin.routes.js](backend/src/routes/admin.routes.js).

| Method | Đường dẫn | Chức năng |
| --- | --- | --- |
| GET, POST | `/admin/courts` | Danh sách hoặc tạo cụm sân |
| GET, PUT, DELETE | `/admin/courts/:id` | Xem, sửa, ẩn cụm sân |
| PUT | `/admin/courts/:id/block` | Thay đổi trạng thái khóa/mở cụm sân theo điều kiện dữ liệu |
| DELETE | `/admin/courts/:id/images/:publicId` | Xóa ảnh thuộc sân; encode `publicId` |
| GET | `/admin/courts/:id/subcourts` | Danh sách sân con |
| POST | `/admin/courts/:courtId/subcourts` | Tạo sân con và lịch |
| PUT, DELETE | `/admin/subcourts/:id` | Sửa hoặc ẩn sân con |
| GET | `/admin/bookings` | Danh sách và lọc booking |
| PUT | `/admin/bookings/:id/confirm` | Xác nhận đơn |
| PUT | `/admin/bookings/:id/cash-payment` | Ghi nhận tiền mặt đã thực thu |
| PUT | `/admin/bookings/:id/refund` | Ghi nhận đã thực hoàn tiền cho đơn chờ hoàn |
| PUT | `/admin/bookings/:id/complete` | Hoàn tất đơn đủ điều kiện |
| PUT | `/admin/bookings/:id/cancel` | Hủy đơn và giải phóng đúng ô giờ |
| GET | `/admin/analytics/dashboard` | Thống kê tổng quan |
| GET | `/admin/analytics/revenue` | Thống kê doanh thu |
| GET | `/admin/analytics/peak-hours` | Thống kê giờ chơi |
| GET, PUT | `/admin/settings` | Đọc cấu hình; chỉ cho sửa `websiteInfo`, `slotDaysAhead` |
| GET | `/admin/users` | Danh sách và lọc người dùng |
| GET | `/admin/users/:id` | Chi tiết người dùng |
| PUT | `/admin/users/:id/toggle-status` | Khóa/mở tài khoản |
| PUT | `/admin/users/:id/role` | Gán USER/ADMIN/VENDOR chủ sân; không gán vai trò nghiệp vụ đã tắt |

Điều chỉnh trạng thái khả dụng của sân/sân con được giữ. Tạo phiếu bảo trì, phân công nhân viên, giao hàng và quản lý dụng cụ đã tắt. Giao diện Settings không còn cho chỉnh OTP vì các giá trị cũ đó không điều khiển luồng xác thực hiện tại.

### Chủ sân

Yêu cầu **VENDOR với `vendorType: COURT`**; middleware cũng cho ADMIN đi qua, nhưng các truy vấn sở hữu vẫn áp dụng theo tài khoản. Quản trị toàn hệ thống dùng nhóm `/admin`. Nguồn: [vendor.routes.js](backend/src/routes/vendor.routes.js).

| Method | Đường dẫn | Chức năng |
| --- | --- | --- |
| GET | `/vendor/stats` | Thống kê sân của tài khoản |
| GET, POST | `/vendor/courts` | Danh sách hoặc tạo cụm sân của mình |
| PUT, DELETE | `/vendor/courts/:id` | Sửa hoặc ẩn sân thuộc quyền sở hữu |
| GET, POST | `/vendor/courts/:courtId/subcourts` | Xem hoặc tạo sân con thuộc cụm sân của mình |
| PUT, DELETE | `/vendor/subcourts/:id` | Sửa hoặc ẩn sân con của mình |
| GET | `/vendor/bookings` | Xem lịch đặt tại sân của mình |
| GET | `/vendor/reviews` | Xem đánh giá sân của mình |

Chủ sân hiện xem lịch và quản lý sân; xác nhận đơn, ghi nhận thu tiền/hoàn tiền và hủy hộ khách do ADMIN thực hiện. Nhà cung cấp dụng cụ không được dùng các API vận hành chủ sân.

## API đã vô hiệu hóa

Các nhóm sau trả **HTTP 501**, mã `FEATURE_IN_DEVELOPMENT`. `/*` bao gồm chính prefix và các đường dẫn con; mọi HTTP method nghiệp vụ đều bị chặn, không gọi controller hay upload của chức năng bị tắt.

| Nhóm | Đường dẫn |
| --- | --- |
| Shipper/giao hàng | `/shipper/*` |
| Nhân viên bảo trì | `/maintenance-staff/*` |
| Coupon, điểm thưởng | `/coupons/*`, `/points/*` |
| Dụng cụ, nhập kho, phiếu bảo trì admin | `/admin/equipments/*`, `/admin/import-orders/*`, `/admin/maintenance/*` |
| Thống kê dụng cụ | `/admin/analytics/equipment-stats` |
| Nghiệp vụ phụ vendor | `/vendor/equipments/*`, `/vendor/import-orders/*`, `/vendor/shippers/*`, `/vendor/deliveries/*`, `/vendor/maintenance/*`, `/vendor/maintenance-staff/*` |
| Chuẩn bị/trả dụng cụ theo booking | `/vendor/bookings/:id/prepare`, `/vendor/bookings/:id/return-equipment` |
| Thuê dụng cụ khi đặt sân | `/bookings/equipments/*` |
| Thanh toán online cũ | `/bookings/:id/payment-intent`, `/bookings/:id/verify-payment` |

Body tạo booking chứa dụng cụ, coupon, điểm thưởng hoặc phương thức khác `CASH` cũng bị từ chối; không thể bật lại bằng cách gọi trực tiếp API. Màn hình nghiệp vụ tương ứng hiển thị “Đang phát triển”; hồ sơ cá nhân của tài khoản lịch sử vẫn dùng API hồ sơ chung. Việc chặn được thực hiện cả ở [development.middleware.js](backend/src/middlewares/development.middleware.js) và các router liên quan, có kiểm thử chữ hoa/thường và URL encode.

## Việc còn cần cấu hình/kiểm chứng

- **SMTP:** cần tài khoản gửi thực và App Password phù hợp trong cấu hình backend để gửi OTP, khôi phục mật khẩu và nhắc lịch. Không lưu mật khẩu vào Git. Chưa xác minh gửi tới Gmail thật; kiểm thử dùng mail giả lập. Thiếu cấu hình SMTP thì đăng ký/khôi phục có thể trả `503`, email nhắc không được đánh dấu đã gửi.
- **Google:** client ID frontend/backend phải tương ứng cùng ứng dụng Web; cấu hình đúng JavaScript origins trong Google Console, build lại frontend sau khi đổi biến Vite. Không truyền OAuth access token vào API ID-token login. Việc kiểm thử mã không thay thế kiểm chứng đăng nhập thật qua Google Console.
- **Ảnh:** upload avatar, ảnh sân và review cần Cloudinary được cấu hình đúng.
- **Dữ liệu sân:** nhập tọa độ thật và tạo sân con để tìm gần/đặt sân có kết quả. Luồng đặt sân phụ thuộc MongoDB; xác thực phiên/OTP và giới hạn request phụ thuộc Redis. Backend phải chạy liên tục để dọn lịch và gửi nhắc.
- **Kiểm thử:** đã bổ sung kiểm thử route bị tắt, quyền tài khoản, tìm sân, booking đồng thời, vòng đời thu/hoàn tiền, giữ chỗ và nhắc lịch. Xem script kiểm thử trong [backend/package.json](backend/package.json); không coi test mail giả là xác nhận email thật đã đến hộp thư.

Chi tiết cấu hình: [AUTH_SETUP.md](AUTH_SETUP.md). Hướng dẫn luồng đặt sân: [BOOKING_SETUP.md](BOOKING_SETUP.md). Swagger tại `/api-docs` hiện chỉ mô tả các route có annotation; bảng này liệt kê phạm vi router đầy đủ hơn.

## Kết quả kiểm tra ngày 14/11/2026

- Backend `npm test`: **46/46 đạt**; `npm run test:integration`: **47/47 đạt** trên database MongoDB kiểm thử riêng, tự dọn sau khi chạy. Có kiểm thử gợi ý địa danh khi chưa có sân, địa chỉ công khai, tên trùng khác tỉnh, phân biệt phường mới với thành phố/quận cũ, hai người cùng đặt qua HTTP và seed demo không phá dữ liệu.
- Frontend `npm test`: **11/11 đạt**, kiểm tra refresh đồng thời, phản hồi 401 tới muộn, logout trong lúc refresh, lỗi mạng tạm thời, debounce/hủy request gợi ý và xóa mã vùng cũ khi nhập tự do. `npm run build` thành công.
- Đã build image mới và cập nhật container backend/frontend, giữ nguyên volume MongoDB/Redis. Backend khởi động và kết nối cả hai dịch vụ thành công.
- Đã kiểm tra 11 yêu cầu HTTP qua backend và proxy Nginx: tìm sân/danh sách/Swagger trả 200; ngày sai và Google token thiếu trả 400; API cần đăng nhập trả 401; API phụ bị tắt trả 501. Đã mở trang tìm sân và bộ lọc trong trình duyệt. Chưa kiểm thử đặt sân bằng tài khoản thật trên dữ liệu vận hành; luồng này được kiểm tra trong database riêng.
- Bổ sung 8 kiểm tra HTTP cho endpoint gợi ý và mã vùng: `thu duc`, `Q.7`, `TPHCM`, gợi ý ban đầu, tham số lặp, limit quá lớn, mã vùng sai/đúng. Đã kiểm tra trên trình duyệt localhost: gợi ý hiển thị, Enter và chuột áp dụng đúng `locationId`, nhập tự do loại bỏ ID cũ, Escape đóng danh sách. Endpoint gợi ý được đăng ký trước route `/:id`.
- Theo yêu cầu tạo dữ liệu tượng trưng, MongoDB `pickleball_booking` hiện có **6 cụm sân demo, 12 sân con, 5.760 slot cho 30 ngày và 2 tài khoản USER demo**. Tất cả có nhãn DEMO, vị trí minh hoạ cách điểm thử dưới 2,3 km. Không xóa dữ liệu hiện hữu; mật khẩu ngẫu nhiên được lưu cục bộ và bỏ khỏi Git. Xem [DEMO_SETUP.md](DEMO_SETUP.md).
- Đã thử HTTP thực và hai phiên trình duyệt riêng trên Docker: hai người cùng đặt một slot cho một `201`, một `409`, chỉ một booking giữ chỗ; UI báo đã đặt, xóa lựa chọn và khóa ô giờ. Đơn mẫu HTTP được giữ lại, đơn thử qua trình duyệt đã hủy đúng API. Đây là dữ liệu demo, chưa xác minh một giao dịch kinh doanh thật.
- SMTP hiện vẫn là cấu hình mẫu; chưa gửi thư thật. Google Client ID backend khớp với cấu hình build Docker, nhưng chưa kiểm chứng màn hình consent/origins trong Google Console bằng tài khoản thật.
- Lint toàn frontend còn **8 lỗi, 4 cảnh báo** trong mã cũ: các trang coupon/bảo trì/shipper/reward/dụng cụ đã ngừng dùng, cấu hình Vite và cảnh báo hook ở hồ sơ vai trò. Các file chức năng được sửa đã qua kiểm tra lint tập trung. Build vẫn có cảnh báo bundle lớn hơn 500 kB.
- Lần cài dependency production backend báo **9 lỗ hổng dependency: 1 moderate, 6 high, 2 critical**. Chưa nâng cấp diện rộng trong đợt sửa nghiệp vụ này; cần rà soát dependency trước khi triển khai công khai.
- Lần build Docker frontend hiện báo **18 lỗ hổng dependency: 1 low, 6 moderate, 11 high** (bao gồm dependency build). Bổ sung autocomplete không thêm package mới.

Các thay đổi đã lưu trong working tree; không cần thực hiện lại toàn bộ khi tiếp tục phiên làm việc. Các việc còn lại trước khi dùng thật: cấu hình SMTP và kiểm tra nhận thư, kiểm chứng Google login trên origin triển khai, bổ sung dữ liệu sân/tọa độ thật, xử lý cảnh báo dependency và lint cũ.
