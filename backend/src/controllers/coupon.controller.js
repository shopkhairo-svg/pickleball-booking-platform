import couponService from "../services/coupon.service.js";

class CouponController {
    async validateCoupon(req, res) {
        try {
            const { coupon, discountAmount } = await couponService.validateCoupon(req.user.id, req.body);
            return res.status(200).json({ success: true, coupon, discountAmount });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getAvailableCoupons(req, res) {
        try {
            const coupons = await couponService.listAvailable(req.user.id, req.query.orderValue);
            return res.status(200).json({ success: true, coupons });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getAdminCoupons(req, res) {
        try {
            const result = await couponService.listAdmin(req.query);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async createCoupon(req, res) {
        try {
            const result = await couponService.createCoupon(req.body);
            return res.status(201).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateCoupon(req, res) {
        try {
            const result = await couponService.updateCoupon(req.params.id, req.body);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async deleteCoupon(req, res) {
        try {
            const result = await couponService.deleteCoupon(req.params.id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }
}

export default new CouponController();
