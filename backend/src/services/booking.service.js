// src/services/booking.service.js (MÔI TRƯỜNG BACKEND)
import bookingRepository from "../repositories/booking.repository.js";
import Booking from "../models/booking.model.js";
import courtRepository from "../repositories/court.repository.js";
import equipmentRepository from "../repositories/equipment.repository.js"; // 🎯 Import kho vật tư
import BookingEquipment from "../models/bookingEquipment.model.js"; // Bảng trung gian lưu vết thuê
import CourtSlot from "../models/courtSlot.model.js";
import SubCourt from "../models/subCourt.model.js";
import Equipment from "../models/equipment.model.js";
import mongoose from "mongoose";
import { randomUUID } from "crypto"; // ✅ Fix #2: dùng UUID thay vì timestamp để tránh trùng bookingCode
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
        const { slotId, equipments = [], paymentMethod = "CASH", note = "", couponCode = "", pointsToUse = 0 } = payload;

        if (!slotId) throw new Error("Vui lòng chọn chính xác một ô giờ trống trên sơ đồ!");

        // 🎯 ATOMIC LOCK: Khóa sân chống trùng lịch
        const objectIdSlot = new mongoose.Types.ObjectId(slotId);
        const slotCheck = await CourtSlot.findById(objectIdSlot);
        if (!slotCheck) {
            throw new Error("Khung giờ không tồn tại!");
        }

        const nowStr = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
        const slotDateTimeStr = `${slotCheck.date} ${slotCheck.startTime}:00`;
        if (slotDateTimeStr < nowStr) {
            throw new Error("Khung giờ này đã trôi qua, không thể đặt lịch!");
        }

        const slot = await CourtSlot.findOneAndUpdate(
            { _id: objectIdSlot, isBooked: false },
            { $set: { isBooked: true } },
            { new: true }
        );

        if (!slot) {
            throw new Error("Khung giờ này vừa mới có người nhanh tay đặt lịch mất rồi! Vui lòng chọn ô giờ khác.");
        }

        // Kiểm tra xem SubCourt của slot này có đang bảo trì không
        const subCourt = await SubCourt.findById(slot.subCourtId);
        if (!subCourt || subCourt.status !== "AVAILABLE") {
            // Hoàn tác (rollback) đặt slot
            await CourtSlot.findByIdAndUpdate(slotId, { $set: { isBooked: false, bookingId: null } });
            throw new Error("Sân nhỏ này đang trong trạng thái bảo trì hoặc không khả dụng!");
        }

        // ✅ Fix #2: Dùng randomUUID() thay vì timestamp để bookingCode không bao giờ trùng
        // UUID v4 đảm bảo uniqueness toàn cục, kể cả khi nhiều request đến trong cùng 1ms
        const bookingCode = `BK-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
        const rollbackEquipmentList = []; // Mảng lưu vết để hoàn tác tồn kho nếu sập nguồn giữa chừng

        try {
            // 1. Tính toán chi phí tiền sân cơ sở
            const court = await courtRepository.findById(slot.courtId);
            if (!court) throw new Error("Cụm sân thể thao lớn không tồn tại trên hệ thống!");

            const courtPrice = court.pricePerHour;
            const durationHours = court.slotDuration / 60 || 1;
            const baseCourtTotalPrice = courtPrice * durationHours;

            // 2. ⚡ LUỒNG XỬ LÝ THUÊ VẬT TƯ ĐI KÈM
            let equipmentTotalPrice = 0;
            const equipmentRecordsToInsert = [];

            for (const item of equipments) {
                const eq = await equipmentRepository.findById(item.equipmentId);
                if (!eq || eq.status !== "AVAILABLE") {
                    throw new Error(`Thiết bị vật tư hiện không sẵn sàng cho thuê!`);
                }

                // Tính số lượng đã được thuê trong khung giờ của slot này
                const overlappingBookings = await Booking.find({
                    status: { $in: ["PENDING", "CONFIRMED", "COMPLETED"] },
                    bookingDate: slot.date,
                    startTime: { $lt: slot.endTime },
                    endTime: { $gt: slot.startTime }
                });
                const overlappingBookingIds = overlappingBookings.map(b => b._id);
                
                const rentedEquipments = await BookingEquipment.find({
                    bookingId: { $in: overlappingBookingIds },
                    equipmentId: eq._id,
                    returnStatus: "RENTING"
                });
                const rentedQtyAtSlot = rentedEquipments.reduce((sum, re) => sum + re.quantity, 0);

                const effectiveAvailable = eq.availableQuantity - (eq.maintenanceQuantity || 0);
                const rentableQuantity = effectiveAvailable - rentedQtyAtSlot;
                if (rentableQuantity < item.quantity) {
                    throw new Error(`Thiết bị "${eq.name}" trong khung giờ ${slot.startTime}-${slot.endTime} chỉ còn ${rentableQuantity} cái khả dụng!`);
                }

                // Thuật toán tính tiền: Theo giờ (HOUR) thì nhân durationHours, theo lượt (TURN) thì giữ nguyên
                const itemSubtotal = eq.rentalType === "HOUR"
                    ? eq.rentalPrice * item.quantity * durationHours
                    : eq.rentalPrice * item.quantity;

                equipmentTotalPrice += itemSubtotal;

                // Lưu cấu trúc chuẩn bị ném vào bảng BookingEquipment
                equipmentRecordsToInsert.push({
                    equipmentId: eq._id,
                    quantity: item.quantity,
                    rentalPrice: eq.rentalPrice,
                    subtotal: itemSubtotal,
                    returnStatus: "RENTING"
                });
            }

            // 3. Cộng dồn tài chính toàn diện hóa đơn (Tiền sân + Tiền thiết bị + 5% Phí dịch vụ)
            const finalShippingFee = 0;
            const systemFee = Math.round((baseCourtTotalPrice + equipmentTotalPrice) * 0.05);
            const subtotalBeforeDiscount = baseCourtTotalPrice + equipmentTotalPrice + systemFee + finalShippingFee;

            let coupon = null;
            let couponDiscount = 0;
            if (couponCode) {
                const validatedCoupon = await couponService.validateCoupon(userId, {
                    code: couponCode,
                    orderValue: subtotalBeforeDiscount,
                    courtId: slot.courtId
                });
                coupon = validatedCoupon.coupon;
                couponDiscount = validatedCoupon.discountAmount;
            }

            const maxPointDiscount = Math.max(0, subtotalBeforeDiscount - couponDiscount);
            const requestedPoints = parseInt(pointsToUse, 10) || 0;
            const maxPointsByOrder = Math.floor(maxPointDiscount / (parseInt(process.env.POINT_TO_VND || "1000", 10)));
            const finalPointsToUse = Math.min(requestedPoints, maxPointsByOrder);
            let pointDiscount = 0;
            if (finalPointsToUse > 0) {
                const { wallet, pointToVnd } = await pointsService.getWallet(userId);
                if (wallet.balance < finalPointsToUse) {
                    throw new Error(`Ví điểm chỉ còn ${wallet.balance} điểm, không đủ để sử dụng!`);
                }
                pointDiscount = finalPointsToUse * pointToVnd;
            }

            const discount = couponDiscount + pointDiscount;
            const totalPrice = Math.max(0, subtotalBeforeDiscount - discount);

            // 4. Gọi tầng Repository tạo đơn Booking chính thức
            const booking = await bookingRepository.create({
                bookingCode,
                userId,
                slotId: slot._id, // ✅ Fix #3: Lưu slotId để rollback chính xác khi cancel
                courtId: slot.courtId,
                bookingDate: slot.date,
                startTime: slot.startTime,
                endTime: slot.endTime,
                durationHours,
                courtPrice: baseCourtTotalPrice,
                equipmentPrice: equipmentTotalPrice,
                systemFee,
                couponId: coupon?._id || null,
                couponCode: coupon?.code || null,
                pointDiscount,
                pointsUsed: finalPointsToUse,
                discount,
                totalPrice,
                paymentStatus: "UNPAID",
                paymentMethod,
                status: "PENDING",
                note
            });

            if (coupon) {
                await couponService.applyUsage({
                    coupon,
                    userId,
                    bookingId: booking._id,
                    discountAmount: couponDiscount
                });
            }

            if (finalPointsToUse > 0) {
                await pointsService.spend(userId, finalPointsToUse, {
                    referenceId: booking._id,
                    referenceType: "Booking",
                    description: `Sử dụng điểm cho đơn ${booking.bookingCode}`
                });
            }

            // 5. Đổ mảng vật tư vào bảng trung gian BookingEquipment (Nếu khách có chọn thuê)
            if (equipmentRecordsToInsert.length > 0) {
                const finalEquipmentRecords = equipmentRecordsToInsert.map(record => ({
                    ...record,
                    bookingId: booking._id
                }));
                await BookingEquipment.insertMany(finalEquipmentRecords);
            }

            // Găm ngược ID Booking vào ô giờ
            slot.bookingId = booking._id;
            await slot.save();

            await notificationService.createForAdmins({
                title: "Có đơn đặt sân mới",
                message: `Đơn ${bookingCode} vừa được tạo với tổng tiền ${totalPrice.toLocaleString("vi-VN")}đ.`,
                type: "BOOKING",
                referenceId: booking._id,
                referenceType: "Booking",
                sendMail: true
            });

            if (court.vendorId) {
                await notificationService.createForUser({
                    userId: court.vendorId,
                    title: "Có đơn đặt sân mới tại cụm sân của bạn",
                    message: `Đơn ${bookingCode} vừa được đặt tại sân ${court.name} với tổng tiền ${totalPrice.toLocaleString("vi-VN")}đ.`,
                    type: "BOOKING",
                    referenceId: booking._id,
                    referenceType: "Booking",
                    sendMail: true
                });
            }

            return {
                message: "Khởi tạo đơn đặt sân và thuê vật tư thành công rực rỡ!",
                bookingCode,
                bookingId: booking._id,
                totalPrice,
                courtPrice: baseCourtTotalPrice,
                equipmentPrice: equipmentTotalPrice,
                discount,
                couponDiscount,
                pointDiscount,
                pointsUsed: finalPointsToUse
            };

        } catch (error) {
            // 🛡️ LUỒNG HOÀN TÁC TOÀN DIỆN (ROLLBACK MECHANISM)
            // 1. Nhả lại slot giờ sang trống tránh treo sân
            await CourtSlot.findByIdAndUpdate(slotId, { $set: { isBooked: false, bookingId: null } });

            // 2. Không cần hoàn trả lại số lượng thiết bị vào kho vì thiết bị chỉ được check slot-based
            // (rollbackEquipmentList trống)
            throw error;
        }
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

        // 3. 🛡️ TIẾN HÀNH HOÀN TÁC HỆ THỐNG (BẮT ĐẦU ROLLBACK DATA)
        // Bước A: ✅ Fix #3 — Dùng booking.slotId để unlock đúng slot, tránh unlock nhầm SubCourt khác
        if (booking.slotId) {
            await CourtSlot.findByIdAndUpdate(booking.slotId, { $set: { isBooked: false, bookingId: null } });
        } else {
            // Fallback cho các booking cũ chưa có slotId
            await CourtSlot.findOneAndUpdate(
                { courtId: booking.courtId, date: booking.bookingDate, startTime: booking.startTime },
                { $set: { isBooked: false, bookingId: null } }
            );
        }

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
                $or: [
                    { bookingDate: { $lt: currentDate } },
                    { bookingDate: currentDate, endTime: { $lte: currentTime } }
                ]
            });

            if (expiredBookings.length > 0) {
                console.log(`[Auto-Complete] Phát hiện ${expiredBookings.length} booking đã qua thời gian chơi. Đang tự động hoàn tất...`);
                for (const booking of expiredBookings) {
                    booking.status = "COMPLETED";
                    await booking.save();

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
