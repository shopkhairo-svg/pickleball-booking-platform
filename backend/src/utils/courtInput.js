import { parseCoordinates } from "./coordinates.js";
import { queryNumber, vietnamDate } from "./courtQuery.js";
import { slotTimes } from "./slotTimes.js";
import CourtSlot from "../models/courtSlot.model.js";

const badRequest = message => Object.assign(new Error(message), { status: 400 });

export function courtText(value, label, { required = false, max = 300 } = {}) {
    if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) throw badRequest(`${label} không hợp lệ.`);
    return value.trim();
}

export function courtStatus(value) {
    const status = courtText(value, "Trạng thái").toUpperCase();
    if (!["AVAILABLE", "MAINTENANCE", "HIDDEN"].includes(status)) throw badRequest("Trạng thái sân không hợp lệ.");
    return status;
}

export function parseCourtInput(data, existing) {
    if (!data || typeof data !== "object" || Array.isArray(data)) throw badRequest("Thông tin sân không hợp lệ.");
    const result = parseCoordinates(data, existing || {});
    for (const key of ["name", "location", "address", "description"]) {
        const required = key === "name" || key === "location";
        if (data[key] !== undefined || (!existing && required)) result[key] = courtText(data[key], key, { required, max: key === "description" ? 5000 : 300 });
    }
    if (data.type !== undefined || !existing) {
        result.type = courtText(data.type, "Loại sân").toUpperCase();
        if (!["INDOOR", "OUTDOOR"].includes(result.type)) throw badRequest("Loại sân không hợp lệ.");
    }
    if (data.pricePerHour !== undefined || !existing) result.pricePerHour = queryNumber(data.pricePerHour, { min: 0, max: 1000000000, integer: true });
    for (const key of ["openTime", "closeTime"]) if (data[key] !== undefined) result[key] = courtText(data[key], "Giờ hoạt động", { required: true });
    if (data.slotDuration !== undefined) result.slotDuration = queryNumber(data.slotDuration, { min: 15, max: 720, integer: true });
    if (data.status !== undefined) result.status = courtStatus(data.status);
    if (data.amenities !== undefined) {
        const amenities = typeof data.amenities === "string" ? data.amenities.split(",") : data.amenities;
        if (!Array.isArray(amenities) || amenities.length > 50) throw badRequest("Danh sách tiện ích không hợp lệ.");
        result.amenities = amenities.map(value => courtText(value, "Tiện ích", { max: 100 })).filter(Boolean);
    }
    const base = existing?.toObject ? existing.toObject() : (existing || {});
    slotTimes({ ...base, ...result });
    return result;
}

export function scheduleChanged(data, existing) {
    return ["openTime", "closeTime", "slotDuration"].some(key => data[key] !== undefined && data[key] !== existing[key]);
}

export function activeSlotFilter(identity, now = new Date()) {
    const date = vietnamDate(now);
    const time = now.toLocaleTimeString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", hour12: false });
    return { ...identity, isBooked: true, $or: [{ date: { $gt: date } }, { date, endTime: { $gt: time } }] };
}

export async function assertCourtCanClose(identity) {
    if (await CourtSlot.exists(activeSlotFilter(identity))) throw badRequest("Sân còn lịch đặt đang diễn ra hoặc sắp tới. Hãy xử lý các đơn này trước khi ẩn hoặc ngừng hoạt động sân.");
}

export async function assertScheduleAllowsBookings(courtId, data, existing) {
    if (!scheduleChanged(data, existing)) return;
    const openTime = data.openTime ?? existing.openTime;
    const closeTime = data.closeTime ?? existing.closeTime;
    const invalid = await CourtSlot.exists({ $and: [activeSlotFilter({ courtId }), { $or: [{ startTime: { $lt: openTime } }, { endTime: { $gt: closeTime } }] }] });
    if (invalid) throw badRequest("Giờ hoạt động mới nằm ngoài lịch đã đặt. Hãy xử lý các đơn liên quan trước khi đổi giờ.");
}
