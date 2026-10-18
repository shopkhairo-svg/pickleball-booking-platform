import mongoose from "mongoose";

const userPointsWalletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    lifetimeEarned: {
        type: Number,
        default: 0,
        min: 0
    },
    lifetimeSpent: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

export default mongoose.model("UserPointsWallet", userPointsWalletSchema);
