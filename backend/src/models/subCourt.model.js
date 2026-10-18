import mongoose from "mongoose";

const subCourtSchema = new mongoose.Schema({
    courtId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Court",
        required: true
    },
    name: {
        type: String, // Ví dụ: "Sân số 01 (VIP Indoor)", "Sân số 02"
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ["AVAILABLE", "MAINTENANCE", "HIDDEN"],
        default: "AVAILABLE"
    }
}, {
    timestamps: true
});

// Chống tạo trùng tên sân nhỏ trong cùng một cụm sân lớn (chỉ áp dụng cho sân đang hoạt động/bảo trì, bỏ qua sân đã ẩn)
subCourtSchema.index(
    { courtId: 1, name: 1 },
    { unique: true, partialFilterExpression: { status: { $ne: "HIDDEN" } } }
);

export default mongoose.model("SubCourt", subCourtSchema);