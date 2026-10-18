import mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
    ownerType: {
        type: String,
        enum: ["SYSTEM"],
        default: "SYSTEM"
    },
    pendingBalance: {
        type: Number,
        default: 0,
        min: 0
    },
    availableBalance: {
        type: Number,
        default: 0,
        min: 0
    },
    refundedBalance: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

walletSchema.index({ ownerType: 1 }, { unique: true });

export default mongoose.model("Wallet", walletSchema);
