import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
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
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true,
        maxlength: 1500,
        default: ""
    },
    images: [
        {
            imageUrl: { type: String, required: true },
            publicId: { type: String, default: null }
        }
    ],
    status: {
        type: String,
        enum: ["PENDING", "APPROVED", "HIDDEN", "DELETED"],
        default: "PENDING"  // ✅ Fix: Mọi review đều phải chờ Admin duyệt trước khi public
    }
}, {
    timestamps: true
});

reviewSchema.index({ courtId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, createdAt: -1 });
reviewSchema.index({ bookingId: 1 });
reviewSchema.index({ userId: 1, courtId: 1, bookingId: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);
