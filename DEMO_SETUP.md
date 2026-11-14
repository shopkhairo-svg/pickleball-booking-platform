# Dữ liệu demo Thủ Đức – Dĩ An/Bình Dương

Các sân bắt đầu bằng **DEMO** là địa điểm giả lập, không phải doanh nghiệp hoặc địa chỉ sân đã xác minh. Tên, vị trí và tọa độ chỉ phục vụ kiểm thử tìm kiếm, lịch và đặt sân.

## Dữ liệu đã tạo

- 6 cụm sân, mỗi cụm 2 sân con; 3 cụm mang khu vực Thủ Đức và 3 cụm mang Dĩ An/Bình Dương theo địa chỉ cũ.
- Lịch 06:00–22:00, mỗi slot 60 phút, 30 ngày từ ngày chạy seed theo múi giờ Việt Nam: 5.760 slot khi tạo mới. Scheduler tiếp tục bổ sung lịch tương lai khi backend chạy.
- Điểm thử cố định: **10.875, 106.765**. Cả 6 cụm nằm trong bán kính 5 km; đây không phải vị trí GPS của người đang dùng trình duyệt.

| Cụm sân demo | Loại | Giá/giờ | Cách điểm thử |
| --- | --- | --- | --- |
| Linh Trung | Trong nhà | 150.000đ | 0,78 km |
| Linh Xuân | Ngoài trời | 120.000đ | 1,04 km |
| Thủ Đức | Trong nhà | 180.000đ | 1,81 km |
| Đông Hòa | Ngoài trời | 130.000đ | 1,25 km |
| Dĩ An | Trong nhà | 160.000đ | 1,78 km |
| Bình Dương | Ngoài trời | 140.000đ | 2,25 km |

Hai tài khoản có quyền `USER`: `demo.player1@example.invalid` và `demo.player2@example.invalid`. Mật khẩu được tạo ngẫu nhiên khi seed lần đầu, lưu trong **[backend/.demo-credentials.json](backend/.demo-credentials.json)** trên máy chạy seed và đã được `.gitignore` loại khỏi Git. MongoDB chỉ lưu bcrypt hash. Không có mật khẩu dùng chung được hardcode vào mã nguồn; giữ lại file này để đăng nhập và chạy lại seed.

Tên miền `example.invalid` không dùng nhận email. Demo không xác nhận việc gửi Gmail/OTP; kiểm tra email thực cần cấu hình SMTP và tài khoản nhận thư thật. Hai tài khoản demo được tạo trực tiếp theo yêu cầu, không đi qua luồng OTP.

## Chạy seed an toàn

Khởi động Docker Compose, rồi chạy trong thư mục `backend`:

```powershell
npm.cmd run seed:demo -- --mongo-url mongodb://127.0.0.1:27018/pickleball_booking
```

Lệnh yêu cầu ghi rõ database đích, dùng ID cố định và chỉ thêm dữ liệu còn thiếu. Chạy lại không tạo thêm user/cụm sân/sân con trùng, không đổi mật khẩu, không xóa dữ liệu ngoài demo và không mở lại slot đã đặt. Mật khẩu không khớp hoặc ID đã được dùng cho dữ liệu khác sẽ khiến lệnh dừng. Không xóa file mật khẩu để cố đặt lại tài khoản đã tồn tại.

**Không dùng `npm run seed` cũ cho database đang sử dụng:** [seed.js](backend/src/seed.js) có thao tác `dropDatabase()`. Luồng demo mới dùng [seedDemo.js](backend/src/scripts/seedDemo.js) và [seedDemoData.js](backend/src/demo/seedDemoData.js).

## Thử trên giao diện

1. Mở `http://localhost/courts`, nhập `thu duc` hoặc `binh duong` trong ô khu vực để thấy các sân tương ứng. Chọn ngày trong 30 ngày tới.
2. Đăng nhập bằng tài khoản demo 1, chọn sân, sân con và một ô giờ trống. Giao diện hiện giá giờ thực tế cộng 5% phí dịch vụ, thanh toán tại sân.
3. Mở trình duyệt/phiên riêng tư khác và đăng nhập bằng tài khoản demo 2. Nếu tải lịch sau khi người 1 đặt, ô giờ hiện **Đã đặt** và không bấm được.
4. Để thử tranh chấp, cả hai người mở hộp xác nhận cho cùng ô giờ khi nó còn trống. Người 1 xác nhận trước; người 2 xác nhận sau sẽ thấy **“Ô giờ này đã có người đặt. Vui lòng chọn ô giờ khác.”** Hộp xác nhận cũ đóng lại, lựa chọn bị xóa và lịch được tải lại.

Nút **Tìm sân gần tôi** dùng GPS thực của trình duyệt. Nếu đang ở xa vùng demo, kết quả rỗng là đúng. Kiểm tra bán kính từ điểm mẫu qua API (thay ngày bằng ngày tương lai trong lịch):

```text
GET /api/courts/nearby?lat=10.875&lng=106.765&radius=5&date=YYYY-MM-DD&limit=50
```

## Cơ chế chống đặt trùng

Backend nhận `slotId`, suy ra sân con/ngày/giờ từ database và chỉ giữ chỗ khi cập nhật có điều kiện `{ _id: slotId, isBooked: false }` thành công. MongoDB thực hiện thao tác đó nguyên tử trên một document; hai request cùng slot chỉ có một request lấy được quyền giữ chỗ. Index duy nhất trên `subCourtId + date + startTime` ngăn tạo trùng bản ghi slot.

- Thành công: `201`; đơn `COMMITTED`, `PENDING`, `UNPAID` và slot trỏ tới đúng booking.
- Người khác đã đặt: `409 / SLOT_ALREADY_BOOKED`; frontend tải lại lịch và hiển thị thông báo rõ ràng.
- Slot đã bị xóa/đổi lịch: `409 / SLOT_UNAVAILABLE`.
- Gửi lại đúng `requestKey` đã thành công trả cùng booking, không tạo thêm đơn. Intent đã thất bại trả `RESERVATION_FAILED`; thử ô giờ mới dùng request key mới.

Hai sân con khác nhau vẫn được đặt cùng giờ. Việc kiểm tra trên giao diện chỉ hỗ trợ trải nghiệm; backend là nơi quyết định quyền giữ chỗ, kể cả khi giao diện đang giữ lịch cũ.

## Kiểm thử có thể chạy lại

Trong `backend`, trên localhost đang chạy:

```powershell
npm.cmd run verify:demo -- --mongo-url mongodb://127.0.0.1:27018/pickleball_booking
```

Script đăng nhập cả hai user, kiểm tra 6 sân trong bán kính và hai bộ lọc khu vực, gửi đồng thời 2 request cho **Sân demo 01 tại Linh Trung, 18:00–19:00, ngày hiện tại +2**, kiểm tra chỉ một booking `COMMITTED` và request thắng được phát lại an toàn. Script giữ lại một đơn demo chờ xác nhận để xem trên giao diện; chạy lại cùng ngày xác minh đơn đó thay vì tạo thêm. Script chỉ đọc trực tiếp MongoDB, đặt sân qua HTTP và đăng xuất hai phiên khi xong.

Trong thư mục gốc:

```powershell
npm.cmd ci
npm.cmd run test:demo:browser
```

Script dùng Chromium của Playwright hoặc Microsoft Edge cài sẵn, đăng nhập UI trong hai context riêng, dùng **Sân demo 02, 19:00–20:00, ngày hiện tại +2** để kiểm tra xung đột và thông báo trên giao diện. Nó chỉ hủy đơn do chính lần chạy đó tạo bằng API hủy, giữ nguyên lịch sử hủy và không đụng vào đơn mẫu 18:00. Không ghi mật khẩu/token, trace hay trạng thái đăng nhập ra báo cáo.

Các kiểm thử tự động khác: trong `backend`, chạy `npm.cmd test` và `npm.cmd run test:integration`; trong `frontend`, chạy `npm.cmd test`. Kiểm thử integration dùng database ngẫu nhiên riêng và chỉ dọn database đó.

## Kết quả ngày 14/11/2026

- Backend: **46 kiểm thử unit/contract + 47 kiểm thử integration** đạt. Frontend: **11 kiểm thử** đạt. Build Docker frontend/backend và lint tập trung thành công.
- HTTP thật: 6 sân gần điểm mẫu, 3 sân Thủ Đức, 3 sân Bình Dương; hai user cạnh tranh cho kết quả `201` / `409 SLOT_ALREADY_BOOKED`, chỉ một booking đã giữ chỗ.
- Đơn mẫu còn lại: **Linh Trung / Sân demo 01 / 16-11-2026 / 18:00–19:00**, tài khoản `demo.player1@example.invalid`, đang chờ xác nhận và chưa thanh toán.
- Hai phiên trình duyệt thật: đăng nhập thành công, người thứ hai thấy thông báo xung đột, slot bị vô hiệu hóa, lựa chọn cũ được xóa. Đơn do kiểm thử trình duyệt tạo đã được hủy đúng API.

Seed và dữ liệu mẫu không thay thế kiểm chứng SMTP/Google login thật hoặc dữ liệu vị trí sân kinh doanh thực tế. Xem thêm [BOOKING_SETUP.md](BOOKING_SETUP.md) và [API_STATUS.md](API_STATUS.md).
