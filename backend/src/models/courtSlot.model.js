// src/models/courtSlot.model.js
import mongoose from "mongoose";

const courtSlotSchema = new mongoose.Schema({
    subCourtId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCourt",
        required: true
    },
    courtId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Court",
        required: true
    },
    date: {
        type: String, // Định dạng: YYYY-MM-DD
        required: true
    },
    startTime: {
        type: String, // Ví dụ: "08:00"
        required: true
    },
    endTime: {
        type: String, // Ví dụ: "09:00"
        required: true
    },
    isBooked: {
        type: Boolean,
        default: false
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        default: null
    }
}, {
    timestamps: true
});

// INDEX CHỐNG TRÙNG TUYỆT ĐỐI: 1 sân nhỏ không thể có 2 slot trùng ngày và trùng giờ đầu vào!
courtSlotSchema.index({ subCourtId: 1, date: 1, startTime: 1 }, { unique: true });
courtSlotSchema.index({ courtId: 1, date: 1 });

export default mongoose.model("CourtSlot", courtSlotSchema);