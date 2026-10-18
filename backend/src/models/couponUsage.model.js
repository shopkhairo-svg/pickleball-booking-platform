import mongoose from "mongoose";

const couponUsageSchema = new mongoose.Schema({
    couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        required: true
    },
    discountAmount: {
        type: Number,
        required: true,
        min: 0
    }
}, {
    timestamps: true
});

couponUsageSchema.index({ couponId: 1, userId: 1 });
couponUsageSchema.index({ bookingId: 1 }, { unique: true });

export default mongoose.model("CouponUsage", couponUsageSchema);
