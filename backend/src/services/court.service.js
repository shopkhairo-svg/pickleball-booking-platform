import mongoose from "mongoose";
import { parseCoordinates, distanceKm, coordinateBounds } from "../utils/coordinates.js";
import { buildCourtFilters } from "../utils/courtFilters.js";
import { courtDate, futureSlotFilter, queryNumber, vietnamDate } from "../utils/courtQuery.js";
import courtRepository from "../repositories/court.repository.js";
import SubCourt from "../models/subCourt.model.js";
import CourtSlot from "../models/courtSlot.model.js";

const pagination = (total, page, limit) => ({ totalItems: total, currentPage: page, totalPages: Math.ceil(total / limit), limit });

// Filter before pagination so fully booked courts never consume a result page.
async function availableCourtIds(date, ids) {
    const slotFilter = futureSlotFilter(date);
    if (!slotFilter || (ids && ids.length === 0)) return [];
    const subs = await SubCourt.find({ status: "AVAILABLE", ...(ids ? { courtId: { $in: ids } } : {}) }).select("_id").lean();
    return CourtSlot.distinct("courtId", { ...slotFilter, subCourtId: { $in: subs.map(sub => sub._id) }, ...(ids ? { courtId: { $in: ids } } : {}) });
}

class CourtService {
    async getCourtsListing(queryParams) {
        const { filter, limit, page, skip, date } = buildCourtFilters(queryParams);
        if (date) filter._id = { $in: await availableCourtIds(date) };
        const { courts, total } = await courtRepository.findAndCount(filter, skip, limit);
        return { courts, ...(date ? { targetDate: date } : {}), pagination: pagination(total, page, limit) };
    }

    async getCourtDetail(courtId, dateQuery) {
        if (!mongoose.isObjectIdOrHexString(courtId)) throw new Error("Mã sân không hợp lệ.");
        const targetDate = courtDate(dateQuery, vietnamDate());
        const court = await courtRepository.findById(courtId);
        if (!court || court.status === "HIDDEN") throw new Error("Cụm sân này không tồn tại hoặc đã bị tạm ẩn!");
        const [subCourts, slots] = await Promise.all([
            SubCourt.find({ courtId, status: { $ne: "HIDDEN" } }).sort({ name: 1, _id: 1 }).lean(),
            CourtSlot.find({ courtId, date: targetDate }).select("-bookingId").sort({ startTime: 1 }).lean()
        ]);
        const now = new Date();
        const slotsBySub = new Map();
        for (const slot of slots) {
            const key = String(slot.subCourtId);
            if (!slotsBySub.has(key)) slotsBySub.set(key, []);
            slotsBySub.get(key).push(slot);
        }
        const subCourtsTimeline = subCourts.map(sub => ({
            _id: sub._id, name: sub.name, status: sub.status,
            slots: (slotsBySub.get(String(sub._id)) || []).map(slot => ({
                ...slot,
                isPast: new Date(`${slot.date}T${slot.startTime}:00+07:00`) <= now,
                isMaintenance: sub.status !== "AVAILABLE" || court.status !== "AVAILABLE"
            }))
        }));
        return { court, targetDate, subCourtsTimeline };
    }

    async getNearbyCourts(query) {
        const { latitude, longitude } = parseCoordinates({ latitude: query.lat, longitude: query.lng });
        if (latitude == null || longitude == null) throw new Error("Vui lòng cung cấp vĩ độ và kinh độ.");
        const radius = queryNumber(query.radius, { fallback: 5, min: Number.EPSILON, max: 100 });
        const date = courtDate(query.date, vietnamDate());
        const { filter, page, limit, skip } = buildCourtFilters(query);
        const courts = await courtRepository.findWithCoordinates(filter, coordinateBounds(latitude, longitude, radius));
        const within = courts.map(court => ({ ...court, distanceKm: distanceKm(latitude, longitude, court.latitude, court.longitude) }))
            .filter(court => court.distanceKm <= radius)
            .sort((a, b) => a.distanceKm - b.distanceKm || String(a._id).localeCompare(String(b._id)));
        const availableIds = new Set((await availableCourtIds(date, within.map(court => court._id))).map(String));
        const available = within.filter(court => availableIds.has(String(court._id)));
        return {
            courts: available.slice(skip, skip + limit).map(court => ({ ...court, distanceKm: Math.round(court.distanceKm * 100) / 100 })),
            targetDate: date, radius, pagination: pagination(available.length, page, limit)
        };
    }
}

export default new CourtService();
