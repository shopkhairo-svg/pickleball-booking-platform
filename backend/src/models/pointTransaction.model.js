import mongoose from "mongoose";

const pointTransactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: ["EARN", "SPEND", "REFUND", "ADJUST"],
        required: true
    },
    points: {
        type: Number,
        required: true
    },
    moneyValue: {
        type: Number,
        default: 0
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    referenceType: {
        type: String,
        default: null
    },
    description: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

pointTransactionSchema.index({ userId: 1, createdAt: -1 });
pointTransactionSchema.index({ referenceId: 1, referenceType: 1 });

export default mongoose.model("PointTransaction", pointTransactionSchema);
