import crypto from "crypto";
import Court from "../models/court.model.js";
import FavoriteCourt from "../models/favoriteCourt.model.js";
import CourtView from "../models/courtView.model.js";
import { searchPattern } from "../utils/courtFilters.js";
import { queryNumber } from "../utils/courtQuery.js";

function validateGuestId(value) {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(value)) throw new Error("Mã khách truy cập không hợp lệ.");
    return value;
}

class CourtInteractionService {
    async toggleFavorite(userId, courtId) {
        const court = await Court.findById(courtId);
        if (!court || court.status === "HIDDEN") throw new Error("Sân không tồn tại!");

        const existing = await FavoriteCourt.findOneAndDelete({ userId, courtId });
        if (existing) {
            await Court.updateOne({ _id: courtId, favoriteCount: { $gt: 0 } }, { $inc: { favoriteCount: -1 } });
            return { message: "Đã bỏ khỏi danh sách yêu thích!", isFavorite: false };
        }

        try {
            await FavoriteCourt.create({ userId, courtId });
            await Court.findByIdAndUpdate(courtId, { $inc: { favoriteCount: 1 } });
        } catch (error) {
            if (error.code !== 11000) throw error;
        }
        return { message: "Đã thêm vào danh sách yêu thích!", isFavorite: true };
    }

    async getFavoriteStatus(userId, courtId) {
        const favorite = await FavoriteCourt.exists({ userId, courtId });
        return { isFavorite: Boolean(favorite) };
    }

    async getFavorites(userId) {
        const favorites = await FavoriteCourt.find({ userId })
            .populate({ path: "courtId", match: { status: { $ne: "HIDDEN" } } })
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

        const safeGuestId = (userId ? null : validateGuestId(guestId)) || crypto.randomUUID();
        const filter = userId ? { userId, courtId } : { userId: null, guestId: safeGuestId, courtId };

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
        const parsedLimit = queryNumber(limit, { fallback: 8, min: 1, max: 20, integer: true });
        const safeGuestId = userId ? null : validateGuestId(guestId);
        if (!userId && !safeGuestId) return { courts: [] };
        const filter = userId ? { userId } : { userId: null, guestId: safeGuestId };
        const views = await CourtView.find(filter)
            .populate("courtId")
            .sort({ lastViewedAt: -1 })
            .limit(parsedLimit);

        return {
            courts: views
                .map(item => item.courtId)
                .filter(court => court && court.status !== "HIDDEN")
        };
    }

    async getSimilarCourts(courtId, limit = 4) {
        const court = await Court.findById(courtId);
        if (!court || court.status === "HIDDEN") throw new Error("Sân không tồn tại!");
        const parsedLimit = queryNumber(limit, { fallback: 4, min: 1, max: 12, integer: true });

        const minPrice = Math.max(0, court.pricePerHour * 0.75);
        const maxPrice = court.pricePerHour * 1.25;

        const courts = await Court.find({
            _id: { $ne: court._id },
            status: "AVAILABLE",
            $or: [
                { type: court.type },
                { location: { $regex: searchPattern(court.location || ""), $options: "i" } },
                { pricePerHour: { $gte: minPrice, $lte: maxPrice } }
            ]
        })
            .sort({ averageRating: -1, bookingCount: -1, favoriteCount: -1 })
            .limit(parsedLimit);

        return { courts };
    }
}

export default new CourtInteractionService();
