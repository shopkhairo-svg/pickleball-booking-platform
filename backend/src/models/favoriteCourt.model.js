import mongoose from "mongoose";

const favoriteCourtSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    courtId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Court",
        required: true
    }
}, {
    timestamps: true
});

favoriteCourtSchema.index({ userId: 1, courtId: 1 }, { unique: true });
favoriteCourtSchema.index({ courtId: 1 });

export default mongoose.model("FavoriteCourt", favoriteCourtSchema);
