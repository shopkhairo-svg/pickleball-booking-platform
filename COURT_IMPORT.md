# Nhập sân từ ảnh bản đồ Đông Hòa – Dĩ An

Danh mục và đường dẫn nguồn nằm trong [mapCourts.js](backend/src/data/mapCourts.js). Địa chỉ được đối chiếu với thông tin công khai; tọa độ chỉ được thêm khi xác định được vị trí địa điểm. Nhiều sân trong ảnh là **cầu lông**, vì vậy tên sân và mô tả giữ đúng bộ môn, không đổi thành sân pickleball.

## Chạy nhập dữ liệu

Chạy tại [backend](backend/), dùng đúng database của ứng dụng:

```powershell
npm run import:map-courts -- --mongo-url mongodb://127.0.0.1:27018/pickleball_booking --dry-run
npm run import:map-courts -- --mongo-url mongodb://127.0.0.1:27018/pickleball_booking
```

Lệnh ghi dữ liệu sao lưu các bản ghi sân và sân con vào `backend/.local-data/` trước khi sửa. Thư mục này không được đưa lên Git. Import nhận diện sân đã có bằng ID và các tên tương ứng để không tạo trùng; giữ ảnh, giá, mô tả, booking và review hiện có. Những nhãn cũ ở sáu ID khởi tạo được làm sạch mà không thay ID.

## Cấu hình đặt lịch

- Giá cấu hình cho sân mới: 60.000–120.000 đồng/giờ; đây không phải báo giá chính thức của chủ sân.
- Mỗi địa điểm mới có 2 sân con, lịch 06:00–22:00, các khung 60 phút trong 30 ngày. Có thể dùng `--days` từ 1 đến 90.
- Lịch và số sân con phục vụ trải nghiệm đặt sân của dự án; không đồng bộ lịch thực tế trên Google Maps hay hệ thống của chủ sân.
- Không nhập ảnh hoặc đánh giá từ Google Maps. Sân mới chưa có ảnh dùng trạng thái ảnh trống của ứng dụng; QTV có thể tải ảnh của sân trong mục quản lý sân.
- Bình Thắng đã có trong database được giữ nguyên và không tạo thêm bản sao.
- **TTP Sports** được nhập ở trạng thái `HIDDEN`: website chính thức xác nhận địa chỉ nhưng giới thiệu dịch vụ thi công sân, chưa xác nhận có cho thuê sân. QTV chỉ bật sau khi kiểm tra và thêm sân con.
- **TomCourts** có địa chỉ nhưng chưa xác minh được tọa độ pin. Sân tìm được qua tên/khu vực, chưa tham gia kết quả tìm theo bán kính. QTV có thể lấy vĩ độ/kinh độ từ vị trí pin Google Maps và điền vào biểu mẫu sửa sân.

Các sân pickleball tạo trước đây vẫn là dữ liệu do dự án cấu hình; việc bỏ nhãn trong giao diện không xác minh chúng là doanh nghiệp thực tế. Các nguồn và ID import được lưu trong mã nguồn để phân biệt với dữ liệu chủ sân tự cập nhật.

## Kiểm tra

```powershell
node --test test/mapCourtImport.integration.test.js
```

Bài kiểm tra dùng database riêng, xác nhận xem trước không ghi dữ liệu, chạy lại không tạo trùng, giữ chỉnh sửa của QTV, slot đã đặt cùng giá riêng, booking và review liên quan.
