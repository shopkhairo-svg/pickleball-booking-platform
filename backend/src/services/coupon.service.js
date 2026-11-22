import Coupon from "../models/coupon.model.js";
import CouponUsage from "../models/couponUsage.model.js";
import User from "../models/user.model.js";
import Booking from "../models/booking.model.js";

class CouponService {
    normalizeDate(value, endOfDay = false) {
        if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+07:00`);
        }
        return new Date(value);
    }

    normalizeCode(code) {
        return String(code || "").trim().toUpperCase();
    }

    calculateDiscount(coupon, orderValue) {
        if (coupon.discountType === "PERCENT") {
            const raw = Math.round(orderValue * (coupon.discountValue / 100));
            return coupon.maxDiscountValue ? Math.min(raw, coupon.maxDiscountValue) : raw;
        }

        if (coupon.discountType === "FIXED") {
            return Math.min(coupon.discountValue, orderValue);
        }

        return 0;
    }

    async validateCoupon(userId, { code, orderValue, courtId }) {
        const normalizedCode = this.normalizeCode(code);
        if (!normalizedCode) throw new Error("Vui lòng nhập mã giảm giá!");

        const coupon = await Coupon.findOne({ code: normalizedCode });
        if (!coupon) throw new Error("Mã giảm giá không tồn tại!");

        const now = new Date();
        if (coupon.status !== "ACTIVE") throw new Error("Mã giảm giá chưa được kích hoạt!");
        if (coupon.targetUserIds?.length && !coupon.targetUserIds.some(id => id.toString() === userId.toString())) throw new Error("Mã ưu đãi này dành cho tài khoản khác!");
        if (coupon.startDate > now) throw new Error("Mã giảm giá chưa đến thời gian sử dụng!");
        if (coupon.endDate < now) throw new Error("Mã giảm giá đã hết hạn!");
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            throw new Error("Mã giảm giá đã hết lượt sử dụng!");
        }

        const safeOrderValue = Number(orderValue || 0);
        if (safeOrderValue < coupon.minOrderValue) {
            throw new Error(`Đơn cần tối thiểu ${coupon.minOrderValue.toLocaleString("vi-VN")}đ để dùng mã này!`);
        }

        if (coupon.applicableCourtIds?.length > 0 && courtId) {
            const allowed = coupon.applicableCourtIds.some(id => id.toString() === courtId.toString());
            if (!allowed) throw new Error("Mã giảm giá không áp dụng cho sân này!");
        }

        const usedByUser = await CouponUsage.countDocuments({ couponId: coupon._id, userId });
        if (usedByUser >= coupon.perUserLimit) {
            throw new Error("Bạn đã dùng mã giảm giá này quá số lần cho phép!");
        }

        const discountAmount = this.calculateDiscount(coupon, safeOrderValue);
        return { coupon, discountAmount };
    }

    async listAvailable(userId, orderValue = 0) {
        const now = new Date();
        const coupons = await Coupon.find({
            status: "ACTIVE",
            startDate: { $lte: now },
            endDate: { $gte: now },
            $or: [{ targetUserIds: { $exists: false } }, { targetUserIds: { $size: 0 } }, { targetUserIds: userId }]
        }).sort({ createdAt: -1 });

        const result = [];
        for (const coupon of coupons) {
            const usedByUser = await CouponUsage.countDocuments({ couponId: coupon._id, userId });
            if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) continue;
            if (usedByUser >= coupon.perUserLimit) continue;
            result.push({
                ...coupon.toObject(),
                estimatedDiscount: Number(orderValue) >= coupon.minOrderValue
                    ? this.calculateDiscount(coupon, Number(orderValue))
                    : 0
            });
        }

        return result;
    }

    async applyUsage({ coupon, userId, bookingId, discountAmount }) {
        if (!coupon) return null;

        await CouponUsage.create({ couponId: coupon._id, userId, bookingId, discountAmount });
        const filter = { _id: coupon._id };
        if (coupon.usageLimit) filter.usedCount = { $lt: coupon.usageLimit };
        const updated = await Coupon.findOneAndUpdate(filter, { $inc: { usedCount: 1 } }, { new: true });
        if (!updated) {
            await CouponUsage.deleteOne({ bookingId });
            throw new Error("Mã giảm giá vừa hết lượt sử dụng. Vui lòng chọn mã khác.");
        }
        return updated;
    }

    /**
     * ✅ Fix #9: Hoàn lại lượt dùng coupon khi booking bị hủy
     * Xóa CouponUsage record và giảm usedCount atomically
     */
    async rollbackUsage(bookingId) {
        const usage = await CouponUsage.findOneAndDelete({ bookingId });
        if (!usage) return; // Booking này không dùng coupon, không cần rollback

        // Giảm usedCount atomically (đảm bảo không âm)
        await Coupon.updateOne({ _id: usage.couponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
    }

    async createCoupon(data) {
        const targetEmails = Array.isArray(data.targetEmails)
            ? data.targetEmails
            : String(data.targetEmails || "").split(/[\s,;]+/).filter(Boolean);
        let targetUserIds = data.targetUserIds || [];
        if (targetEmails.length) {
            const emails = [...new Set(targetEmails.map(email => String(email).trim().toLowerCase()).filter(Boolean))];
            const users = await User.find({ email: { $in: emails }, role: "USER", status: "ACTIVE" }).select("_id email");
            const matched = new Set(users.map(user => user.email));
            const missing = emails.filter(email => !matched.has(email));
            if (missing.length) throw new Error(`Không tìm thấy tài khoản người dùng đang hoạt động: ${missing.join(", ")}`);
            targetUserIds = users.map(user => user._id);
        }
        const coupon = await Coupon.create({
            ...data,
            targetEmails: undefined,
            targetUserIds,
            startDate: this.normalizeDate(data.startDate),
            endDate: this.normalizeDate(data.endDate, true),
            code: this.normalizeCode(data.code),
            discountType: data.discountType?.toUpperCase()
        });

        return { message: "Tạo mã giảm giá thành công!", coupon };
    }

    async updateCoupon(id, data) {
        const updateData = { ...data };
        if (updateData.code) updateData.code = this.normalizeCode(updateData.code);
        if (updateData.discountType) updateData.discountType = updateData.discountType.toUpperCase();
        if (updateData.startDate) updateData.startDate = this.normalizeDate(updateData.startDate);
        if (updateData.endDate) updateData.endDate = this.normalizeDate(updateData.endDate, true);

        const coupon = await Coupon.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
        if (!coupon) throw new Error("Mã giảm giá không tồn tại!");

        return { message: "Cập nhật mã giảm giá thành công!", coupon };
    }

    async deleteCoupon(id) {
        const coupon = await Coupon.findByIdAndDelete(id);
        if (!coupon) throw new Error("Mã giảm giá không tồn tại!");
        return { message: "Đã xóa mã giảm giá!" };
    }

    async listAdmin(query = {}) {
        const filter = {};
        if (query.status) filter.status = query.status.toUpperCase();
        const coupons = await Coupon.find(filter).sort({ createdAt: -1 });
        return { coupons };
    }

    // Reward a player after their 3rd and 5th completed, paid booking at the same court.
    // A deterministic unique code makes the award safe to retry if completion is retried.
    async awardCourtLoyalty(booking) {
        const completedCount = await Booking.countDocuments({
            userId: booking.userId, courtId: booking.courtId,
            status: "COMPLETED", paymentStatus: "PAID"
        });
        const tier = completedCount >= 5 ? 5 : completedCount >= 3 ? 3 : null;
        if (!tier) return null;
        const code = `CT${String(booking.courtId).toUpperCase()}U${String(booking.userId).toUpperCase()}T${tier}`;
        try {
            return await Coupon.create({
                code, name: tier === 5 ? "Ưu đãi khách hàng thân thiết" : "Ưu đãi lần chơi tiếp theo",
                description: `Ưu đãi dành riêng cho bạn sau ${tier} lượt chơi hoàn tất tại sân này.`,
                discountType: "PERCENT", discountValue: tier === 5 ? 10 : 5, maxDiscountValue: tier === 5 ? 100000 : 50000,
                perUserLimit: 1, startDate: new Date(), endDate: new Date(Date.now() + 90 * 86400000),
                status: "ACTIVE", applicableCourtIds: [booking.courtId], targetUserIds: [booking.userId], loyaltyReward: true
            });
        } catch (error) {
            if (error.code === 11000) return null;
            throw error;
        }
    }
}

export default new CouponService();
