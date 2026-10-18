import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ""
    },
    discountType: {
        type: String,
        enum: ["PERCENT", "FIXED"],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    minOrderValue: {
        type: Number,
        default: 0,
        min: 0
    },
    maxDiscountValue: {
        type: Number,
        default: null
    },
    usageLimit: {
        type: Number,
        default: null
    },
    usedCount: {
        type: Number,
        default: 0,
        min: 0
    },
    perUserLimit: {
        type: Number,
        default: 1,
        min: 1
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE", "EXPIRED"],
        default: "ACTIVE"
    },
    applicableCourtIds: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Court"
        }
    ]
}, {
    timestamps: true
});

couponSchema.index({ status: 1, startDate: 1, endDate: 1 });

export default mongoose.model("Coupon", couponSchema);
