import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema({
    importOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ImportOrder",
        required: true
    },
    shipperId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    status: {
        type: String,
        enum: ["PENDING", "PICKED_UP", "SHIPPED", "COMPLETED", "CANCELLED"],
        default: "PENDING"
    },
    proofImage: {
        type: String,
        default: null
    },
    assignedAt: {
        type: Date,
        default: null
    },
    pickedUpAt: {
        type: Date,
        default: null
    },
    shippedAt: {
        type: Date,
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    },
    notes: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

deliverySchema.index({ importOrderId: 1 });
deliverySchema.index({ shipperId: 1 });
deliverySchema.index({ status: 1 });

export default mongoose.model("Delivery", deliverySchema);
