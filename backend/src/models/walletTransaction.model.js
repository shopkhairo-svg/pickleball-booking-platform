import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema({
    walletId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Wallet",
        required: true
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        default: null
    },
    type: {
        type: String,
        enum: ["HOLD", "RELEASE", "REFUND", "ADJUST"],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["PENDING", "AVAILABLE", "REFUNDED"],
        required: true
    },
    description: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

walletTransactionSchema.index({ bookingId: 1 });
walletTransactionSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("WalletTransaction", walletTransactionSchema);
