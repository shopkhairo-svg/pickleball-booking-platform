// src/repositories/booking.repository.js (MÔI TRƯỜNG BACKEND)
import Booking from "../models/booking.model.js";

class BookingRepository {
    /**
     * Tạo mới một bản ghi hóa đơn đặt sân
     */
    async create(bookingData) {
        return await Booking.create(bookingData);
    }

    /**
     * Tìm kiếm một đơn đặt lịch theo ID
     */
    async findById(id) {
        return await Booking.findById(id);
    }
    async findByUserId(userId) {
        return await Booking.find({ userId })
            .populate("courtId", "name address images") // Kéo thêm tên sân, địa chỉ, ảnh cụm sân lớn để hiển thị ở UI
            .sort({ createdAt: -1 });
    }
    async updateStatusAfterPayment(bookingId, paymentMethod) {
        return await Booking.findByIdAndUpdate(
            bookingId,
            {
                $set: {
                    paymentStatus: "PAID",    // Đổi sang Đã thanh toán
                    status: "CONFIRMED",      // Tự động duyệt đơn sang Đã xác nhận
                    paymentMethod: paymentMethod // CASH, BANKING, MOMO
                }
            },
            { new: true }
        );
    }
}

export default new BookingRepository();