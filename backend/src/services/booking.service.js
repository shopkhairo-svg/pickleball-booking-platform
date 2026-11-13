import { createCoreBooking } from "./createBooking.service.js";
// src/services/booking.service.js (MÔI TRƯỜNG BACKEND)
import bookingRepository from "../repositories/booking.repository.js";
import Booking from "../models/booking.model.js";
import courtRepository from "../repositories/court.repository.js";
import equipmentRepository from "../repositories/equipment.repository.js"; // 🎯 Import kho vật tư
import BookingEquipment from "../models/bookingEquipment.model.js"; // Bảng trung gian lưu vết thuê
import CourtSlot from "../models/courtSlot.model.js";
import couponService from "./coupon.service.js";
import pointsService from "./points.service.js";
import revenueService from "./revenue.service.js";
import notificationService from "./notification.service.js";

class BookingService {
    /**
     * API hỗ trợ Frontend lấy danh sách vật tư hiển thị lên khu vực tích chọn
     * ✅ Fix #10: Lọc theo courtId nếu có, tránh hiển thị thiết bị của sân khác địa phương
     */
    async getAllAvailableEquipments(courtId = null) {
        return await equipmentRepository.findAvailableEquipments(courtId);
    }

    /**
     * Động cơ đặt sân gốc + Thuê vật tư đi kèm (Atomic Lock + Tồn kho an toàn)
     */
    async createNewBooking(userId, payload) {
        return createCoreBooking(userId, payload);
    }
    async getUserBookingHistory(userId) {
        if (!userId) throw new Error("Mã định danh người dùng không hợp lệ!");
        await this.autoCompletePastBookings();

        const bookings = await bookingRepository.findByUserId(userId);
        if (bookings && bookings.length > 0) {
            const bookingIds = bookings.map(b => b._id);
            const equipmentRentals = await BookingEquipment.find({ bookingId: { $in: bookingIds } })
                .populate("equipmentId", "name type image rentalType rentalPrice");
            
            return bookings.map(b => {
                const bObj = b.toObject();
                bObj.equipmentItems = equipmentRentals
                    .filter(eq => eq.bookingId.toString() === b._id.toString())
                    .map(eq => ({
                        equipmentId: eq.equipmentId,
                        quantity: eq.quantity,
                        rentalPrice: eq.rentalPrice,
                        subtotal: eq.subtotal,
                        returnStatus: eq.returnStatus
                    }));
                return bObj;
            });
        }
        return bookings;
    }
    async cancelBookingByUser(userId, bookingId, cancelReason) {
        if (!bookingId) throw new Error("Thiếu mã đơn hàng đặt sân!");

        // 1. Tìm đơn hàng
        const booking = await bookingRepository.findById(bookingId);
        if (!booking) throw new Error("Đơn đặt sân không tồn tại trên hệ thống!");

        // Bảo mật chéo: Tránh hacker bốc bừa ID đơn của người khác để hủy phá hoại
        if (booking.userId.toString() !== userId.toString()) {
            throw new Error("Bạn không có quyền sở hữu đơn hàng này!");
        }

        // Kiểm tra xem đơn đã bị hủy từ trước hoặc đã hoàn thành chưa
        if (["CANCELLED", "COMPLETED"].includes(booking.status)) {
            throw new Error(`Đơn đặt sân này hiện đã ở trạng thái "${booking.status}", không thể hủy nữa!`);
        }

        // 2. 🕒 THUẬT TOÁN KIỂM TRA CHẶN 36 TIẾNG CHUẨN THỜI GIAN THỰC
        // Kết hợp bookingDate (YYYY-MM-DD) và startTime (HH:mm) để ra mốc thời gian đá thực tế
        // ✅ Fix #7: Append "+07:00" để Node.js parse đúng múi giờ Việt Nam (UTC+7)
        // Nếu không có suffix, new Date("2026-06-20T08:00:00") được coi là UTC → lệch 7 tiếng!
        const VN_TZ_OFFSET = "+07:00";
        const matchDateTimeString = `${booking.bookingDate}T${booking.startTime}:00${VN_TZ_OFFSET}`;
        const matchTime = new Date(matchDateTimeString); // Mốc ra sân (giờ VN)
        const now = new Date(); // Thời điểm hiện tại bấm nút hủy

        // Tính khoảng cách thời gian theo đơn vị Mili-giây
        const timeDiffInMs = matchTime.getTime() - now.getTime();
        // Quy đổi ra số Tiếng
        const hoursDiff = timeDiffInMs / (1000 * 60 * 60);

        console.log(`🔍 [DEBUG CANCEL] Khoảng cách thời gian từ bây giờ tới giờ chơi: ${hoursDiff.toFixed(1)} tiếng.`);

        // 💥 CHỐT CHẶN PHÒNG THỦ: Nếu nhỏ hơn 36 tiếng, đá văng ra báo lỗi lập tức!
        if (hoursDiff < 36) {
            throw new Error("Vi phạm chính sách: Bạn chỉ được quyền hủy đặt lịch trước giờ thi đấu tối thiểu 36 tiếng!");
        }

        const cancelled = await Booking.findOneAndUpdate({ _id: booking._id, status: booking.status, paymentStatus: booking.paymentStatus },
            { $set: { status: "CANCELLED", cancelReason: cancelReason || "Cancelled" } }, { new: true });
        if (!cancelled) throw new Error("Booking changed; reload before cancelling.");

        // 3. 🛡️ TIẾN HÀNH HOÀN TÁC HỆ THỐNG (BẮT ĐẦU ROLLBACK DATA)
        // Bước A: ✅ Fix #3 — Dùng booking.slotId để unlock đúng slot, tránh unlock nhầm SubCourt khác
        await CourtSlot.updateOne({ bookingId: booking._id, ...(booking.slotId ? { _id: booking.slotId } : {}) },
            { $set: { isBooked: false, bookingId: null } });

        // Bước B: Hoàn trả lại số lượng tồn kho vật tư (Nếu đơn này có thuê đồ kèm)
        if (booking.equipmentPrice > 0) {
            const rentedItems = await BookingEquipment.find({ bookingId: booking._id });
            for (const item of rentedItems) {
                item.returnStatus = "RETURNED";
                await item.save();
            }
        }

        // Bước C: Cập nhật trạng thái đơn Booking sang HỦY
        booking.status = "CANCELLED";
        booking.cancelReason = cancelReason || "Khách hàng chủ động yêu cầu hủy lịch trên hệ thống.";

        // ✅ Fix #2: Đổi paymentStatus = REFUNDED nếu booking đã PAID (đồng bộ với Admin cancel)
        const wasPaid = booking.paymentStatus === "PAID";
        if (wasPaid) {
            booking.paymentStatus = "REFUNDED";
        }
        await booking.save();

        if (booking.pointsUsed > 0) {
            await pointsService.refund(booking.userId, booking.pointsUsed, {
                referenceId: booking._id,
                referenceType: "Booking",
                description: "Hoàn điểm do khách hủy booking"
            });
        }

        // ✅ Fix #9: Hoàn lại lượt dùng coupon (xóa CouponUsage + giảm usedCount)
        if (booking.couponId) {
            await couponService.rollbackUsage(booking._id);
        }

        // ✅ Fix Section 8: Chỉ gọi refundBookingRevenue khi booking đã PAID
        // Dùng biến wasPaid (tính trước khi save) vì paymentStatus đã bị đổi sang REFUNDED
        if (wasPaid) {
            await revenueService.refundBookingRevenue(booking);
        }

        return {
            message: "Hủy đơn đặt lịch giữ chỗ và hoàn trả thiết bị thành công mỹ mãn!",
            bookingCode: booking.bookingCode,
            status: booking.status
        };
    }
    /**
     * 🎯 THÊM MỚI: Khởi tạo thông tin thanh toán (Sinh mã QR hiển thị ở Frontend)
     */
    async createPaymentIntent(userId, bookingId) {
        const booking = await bookingRepository.findById(bookingId);
        if (!booking) throw new Error("Đơn đặt sân không tồn tại!");

        if (booking.userId.toString() !== userId.toString()) {
            throw new Error("Bạn không có quyền thanh toán cho đơn hàng này!");
        }

        if (booking.paymentStatus === "PAID") {
            throw new Error("Đơn hàng này đã được thanh toán từ trước rồi!");
        }

        if (booking.status === "CANCELLED") {
            throw new Error("Đơn hàng này đã bị hủy, không thể tiến hành thanh toán!");
        }

        // Cấu hình nội dung chuyển khoản tự động
        const paymentDescription = `CHUYEN TIEN SAN ${booking.bookingCode}`;

        // 💡 GIẢ LẬP LINK HOẶC MÃ QR: Tụi mình dùng API VietQR công khai cực đỉnh để sinh QR ngân hàng thật luôn!
        // Định dạng: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<DESCRIPTION>
        const mockQrCodeUrl = `https://img.vietqr.io/image/MB-0900000002-qr_only.png?amount=${booking.totalPrice}&addInfo=${encodeURIComponent(paymentDescription)}`;

        return {
            bookingCode: booking.bookingCode,
            totalPrice: booking.totalPrice,
            paymentDescription,
            qrCodeUrl: mockQrCodeUrl
        };
    }

    /**
     * 🎯 THÊM MỚI: Giả lập Webhook/Callback xử lý khi tiền về túi thành công
     */
    async verifyAndExecutePayment(userId, bookingId, paymentMethod = "MOMO") {
        const booking = await bookingRepository.findById(bookingId);
        if (!booking) throw new Error("Đơn đặt sân không tồn tại!");

        if (booking.userId.toString() !== userId.toString()) {
            throw new Error("Bạn không có quyền xác nhận thanh toán cho đơn này!");
        }

        if (booking.paymentStatus === "PAID") {
            return {message: "Đơn hàng đã được ghi nhận thanh toán từ trước!", booking};
        }

        // Thực thi cập nhật trạng thái trong Database qua Repository
        const updatedBooking = await bookingRepository.updateStatusAfterPayment(bookingId, paymentMethod);
        await courtRepository.incrementStats(booking.courtId, { bookingCount: 1 });

        await revenueService.holdBookingRevenue(updatedBooking);

        await notificationService.createForUser({
            userId: booking.userId,
            title: "Thanh toán thành công",
            message: `Hệ thống đã nhận đủ ${booking.totalPrice.toLocaleString()}đ cho mã đơn ${booking.bookingCode}. Sân chơi của bạn đã được khóa giữ chỗ an toàn!`,
            type: "PAYMENT",
            referenceId: booking._id,
            referenceType: "Booking",
            sendMail: true
        });

        await notificationService.createForAdmins({
            title: "Booking đã thanh toán",
            message: `Đơn ${booking.bookingCode} đã thanh toán ${booking.totalPrice.toLocaleString()}đ.`,
            type: "PAYMENT",
            referenceId: booking._id,
            referenceType: "Booking"
        });

        return {
            message: "Xác nhận thanh toán thành công! Đơn hàng đã được kích hoạt hoạt động.",
            booking: updatedBooking
        };
    }

    async autoCompletePastBookings() {
        try {
            const localDateTime = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
            const match = localDateTime.match(/(\d{4}-\d{2}-\d{2})[,\s]+(\d{2}:\d{2})/);
            let currentDate = "";
            let currentTime = "";
            if (match) {
                currentDate = match[1];
                currentTime = match[2];
            } else {
                const [d, t] = localDateTime.replace(",", "").split(" ");
                currentDate = d;
                currentTime = t.substring(0, 5);
            }

            // Tìm tất cả booking CONFIRMED đã quá giờ chơi
            const expiredBookings = await Booking.find({
                status: "CONFIRMED",
                paymentStatus: "PAID",
                $or: [
                    { bookingDate: { $lt: currentDate } },
                    { bookingDate: currentDate, endTime: { $lte: currentTime } }
                ]
            });

            if (expiredBookings.length > 0) {
                console.log(`[Auto-Complete] Phát hiện ${expiredBookings.length} booking đã qua thời gian chơi. Đang tự động hoàn tất...`);
                for (const booking of expiredBookings) {
                    const completed = await Booking.findOneAndUpdate({ _id: booking._id, status: "CONFIRMED", paymentStatus: "PAID" }, { $set: { status: "COMPLETED" } });
                    if (!completed) continue;

                    try {
                        await revenueService.releaseBookingRevenue(booking);
                    } catch (revErr) {
                        console.error(`[Auto-Complete] Lỗi release booking revenue cho đơn ${booking._id}:`, revErr.message);
                    }

                    if (booking.equipmentPrice > 0) {
                        await BookingEquipment.updateMany(
                            { bookingId: booking._id, returnStatus: "RENTING" },
                            { $set: { returnStatus: "RETURNED" } }
                        );
                    }
                }
            }

            // Dọn dẹp thiết bị ở trạng thái RENTING của các booking đã COMPLETED hoặc CANCELLED trước đó
            const finishedBookings = await Booking.find({
                status: { $in: ["COMPLETED", "CANCELLED"] }
            });
            const finishedBookingIds = finishedBookings.map(b => b._id);
            if (finishedBookingIds.length > 0) {
                const res = await BookingEquipment.updateMany(
                    { bookingId: { $in: finishedBookingIds }, returnStatus: "RENTING" },
                    { $set: { returnStatus: "RETURNED" } }
                );
                if (res.modifiedCount > 0) {
                    console.log(`[Auto-Complete] Tự động cập nhật hoàn trả thiết bị cho ${res.modifiedCount} bản ghi đã hoàn tất từ trước.`);
                }
            }
        } catch (err) {
            console.error("[Auto-Complete] Lỗi khi chạy tự động hoàn tất bookings:", err.message);
        }
    }
}

export default new BookingService();
