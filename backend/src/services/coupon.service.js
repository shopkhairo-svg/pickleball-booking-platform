import Coupon from "../models/coupon.model.js";
import CouponUsage from "../models/couponUsage.model.js";

class CouponService {
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
            endDate: { $gte: now }
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

        await CouponUsage.create({
            couponId: coupon._id,
            userId,
            bookingId,
            discountAmount
        });

        // ✅ Fix #4: Dùng atomic $inc thay vì read-modify-write để tránh race condition
        // Nếu 2 user validate coupon đồng thời, $inc đảm bảo usedCount tăng đúng 2 lần
        await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
        return coupon;
    }

    /**
     * ✅ Fix #9: Hoàn lại lượt dùng coupon khi booking bị hủy
     * Xóa CouponUsage record và giảm usedCount atomically
     */
    async rollbackUsage(bookingId) {
        const usage = await CouponUsage.findOne({ bookingId });
        if (!usage) return; // Booking này không dùng coupon, không cần rollback

        // Xóa record usage
        await CouponUsage.deleteOne({ _id: usage._id });

        // Giảm usedCount atomically (đảm bảo không âm)
        await Coupon.findByIdAndUpdate(usage.couponId, {
            $inc: { usedCount: -1 }
        });
    }

    async createCoupon(data) {
        const coupon = await Coupon.create({
            ...data,
            code: this.normalizeCode(data.code),
            discountType: data.discountType?.toUpperCase()
        });

        return { message: "Tạo mã giảm giá thành công!", coupon };
    }

    async updateCoupon(id, data) {
        const updateData = { ...data };
        if (updateData.code) updateData.code = this.normalizeCode(updateData.code);
        if (updateData.discountType) updateData.discountType = updateData.discountType.toUpperCase();

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
}

export default new CouponService();
