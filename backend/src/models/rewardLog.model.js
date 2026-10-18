import mongoose from "mongoose";

const rewardLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    rewardType: {
        type: String,
        enum: ["POINT", "COUPON"],
        required: true
    },
    points: {
        type: Number,
        default: 0
    },
    couponCode: {
        type: String,
        default: null
    },
    reason: {
        type: String,
        default: ""
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    referenceType: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

rewardLogSchema.index({ userId: 1, createdAt: -1 });
rewardLogSchema.index({ referenceId: 1, referenceType: 1 });

export default mongoose.model("RewardLog", rewardLogSchema);
