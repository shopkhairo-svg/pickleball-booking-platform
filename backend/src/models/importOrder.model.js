import mongoose from "mongoose";

const importOrderSchema = new mongoose.Schema({
    equipmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Equipment",
        required: true
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    status: {
        type: String,
        enum: ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"],
        default: "PENDING"
    }
}, {
    timestamps: true
});

// Indexes
importOrderSchema.index({ vendorId: 1 });
importOrderSchema.index({ status: 1 });

export default mongoose.model("ImportOrder", importOrderSchema);
