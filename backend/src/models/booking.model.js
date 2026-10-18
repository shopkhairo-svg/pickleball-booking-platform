import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({

    bookingCode: {
        type: String,
        unique: true
    },

    // ✅ Fix #3: Lưu slotId để rollback chính xác đúng slot, tránh unlock nhầm slot của SubCourt khác
    slotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CourtSlot",
        default: null
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    courtId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Court",
        required: true
    },

    bookingDate: {
        type: String,
        required: true
    },

    startTime: {
        type: String,
        required: true
    },

    endTime: {
        type: String,
        required: true
    },

    durationHours: {
        type: Number,
        required: true
    },

    courtPrice: {
        type: Number,
        required: true
    },

    equipmentPrice: {
        type: Number,
        default: 0
    },

    systemFee: {
        type: Number,
        default: 0
    },

    couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
        default: null
    },

    couponCode: {
        type: String,
        trim: true,
        uppercase: true,
        default: null
    },

    pointDiscount: {
        type: Number,
        default: 0
    },

    pointsUsed: {
        type: Number,
        default: 0
    },

    discount: {
        type: Number,
        default: 0
    },

    totalPrice: {
        type: Number,
        required: true
    },

    paymentStatus: {
        type: String,
        enum: [
            "UNPAID",
            "PAID",
            "REFUNDED"
        ],
        default: "UNPAID"
    },

    paymentMethod: {
        type: String,
        enum: [
            "CASH",
            "BANKING",
            "MOMO"
        ],
        default: "CASH"
    },

    status: {
        type: String,
        enum: [
            "PENDING",
            "CONFIRMED",
            "CANCELLED",
            "COMPLETED"
        ],
        default: "PENDING"
    },

    cancelReason: {
        type: String
    },

    note: {
        type: String
    },

    isPrepared: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});


// INDEXES
bookingSchema.index({
    userId: 1
});

bookingSchema.index({
    courtId: 1
});

bookingSchema.index({
    bookingDate: 1
});

bookingSchema.index({
    status: 1
});

bookingSchema.index({
    paymentStatus: 1
});

bookingSchema.index({
    createdAt: -1
});


// ANTI DUPLICATE BOOKING
bookingSchema.index({
    courtId: 1,
    bookingDate: 1,
    startTime: 1,
    endTime: 1
});

export default mongoose.model(
    "Booking",
    bookingSchema
);
