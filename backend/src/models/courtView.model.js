import mongoose from "mongoose";

const courtViewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    guestId: {
        type: String,
        trim: true,
        default: null
    },
    courtId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Court",
        required: true
    },
    viewCount: {
        type: Number,
        default: 1,
        min: 1
    },
    lastViewedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

courtViewSchema.index({ userId: 1, courtId: 1 });
courtViewSchema.index({ guestId: 1, courtId: 1 });
courtViewSchema.index({ courtId: 1, lastViewedAt: -1 });

export default mongoose.model("CourtView", courtViewSchema);
