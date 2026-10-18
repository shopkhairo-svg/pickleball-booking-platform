import crypto from "crypto";
import Court from "../models/court.model.js";
import FavoriteCourt from "../models/favoriteCourt.model.js";
import CourtView from "../models/courtView.model.js";

class CourtInteractionService {
    async toggleFavorite(userId, courtId) {
        const court = await Court.findById(courtId);
        if (!court || court.status === "HIDDEN") throw new Error("Sân không tồn tại!");

        const existing = await FavoriteCourt.findOne({ userId, courtId });
        if (existing) {
            await existing.deleteOne();
            await Court.findByIdAndUpdate(courtId, { $inc: { favoriteCount: -1 } });
            return { message: "Đã bỏ khỏi danh sách yêu thích!", isFavorite: false };
        }

        await FavoriteCourt.create({ userId, courtId });
        await Court.findByIdAndUpdate(courtId, { $inc: { favoriteCount: 1 } });
        return { message: "Đã thêm vào danh sách yêu thích!", isFavorite: true };
    }

    async getFavoriteStatus(userId, courtId) {
        const favorite = await FavoriteCourt.exists({ userId, courtId });
        return { isFavorite: Boolean(favorite) };
    }

    async getFavorites(userId) {
        const favorites = await FavoriteCourt.find({ userId })
            .populate("courtId")
            .sort({ createdAt: -1 });

        return {
            courts: favorites
                .map(item => item.courtId)
                .filter(Boolean)
        };
    }

    async recordView({ userId, guestId, courtId }) {
        const court = await Court.findById(courtId);
        if (!court || court.status === "HIDDEN") throw new Error("Sân không tồn tại!");

        const safeGuestId = guestId || crypto.randomUUID();
        const filter = userId ? { userId, courtId } : { guestId: safeGuestId, courtId };

        await CourtView.findOneAndUpdate(
            filter,
            {
                $set: { lastViewedAt: new Date(), ...(userId ? { guestId: null } : { guestId: safeGuestId }) },
                $inc: { viewCount: 1 }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        await Court.findByIdAndUpdate(courtId, { $inc: { viewCount: 1 } });

        return { guestId: safeGuestId };
    }

    async getRecentlyViewed({ userId, guestId, limit = 8 }) {
        const filter = userId ? { userId } : { guestId };
        const views = await CourtView.find(filter)
            .populate("courtId")
            .sort({ lastViewedAt: -1 })
            .limit(Math.min(parseInt(limit, 10) || 8, 20));

        return {
            courts: views
                .map(item => item.courtId)
                .filter(court => court && court.status !== "HIDDEN")
        };
    }

    async getSimilarCourts(courtId, limit = 4) {
        const court = await Court.findById(courtId);
        if (!court) throw new Error("Sân không tồn tại!");

        const minPrice = Math.max(0, court.pricePerHour * 0.75);
        const maxPrice = court.pricePerHour * 1.25;

        const courts = await Court.find({
            _id: { $ne: court._id },
            status: "AVAILABLE",
            $or: [
                { type: court.type },
                { location: { $regex: court.location, $options: "i" } },
                { pricePerHour: { $gte: minPrice, $lte: maxPrice } }
            ]
        })
            .sort({ averageRating: -1, bookingCount: -1, favoriteCount: -1 })
            .limit(Math.min(parseInt(limit, 10) || 4, 12));

        return { courts };
    }
}

export default new CourtInteractionService();
