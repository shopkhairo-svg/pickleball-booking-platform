import mongoose from "mongoose";

const revenueLogSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        required: true,
        unique: true
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
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["HOLDING", "AVAILABLE", "REFUNDED", "CANCELLED"],
        default: "HOLDING"
    },
    releasedAt: {
        type: Date,
        default: null
    },
    refundedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

revenueLogSchema.index({ status: 1, createdAt: -1 });
revenueLogSchema.index({ courtId: 1 });
revenueLogSchema.index({ userId: 1 });

export default mongoose.model("RevenueLog", revenueLogSchema);
