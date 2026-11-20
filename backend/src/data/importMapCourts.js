import { createHash } from "node:crypto";
import Court from "../models/court.model.js";
import SubCourt from "../models/subCourt.model.js";
import CourtSlot from "../models/courtSlot.model.js";
import { DEMO_COURTS } from "../demo/demoData.js";
import { regenerateSlotsForCourt } from "../utils/slotScheduler.js";
import { MAP_COURTS } from "./mapCourts.js";

export const importedCourtId = key => createHash("sha256").update(`pickleball-map-courts-v1:${key}`).digest("hex").slice(0, 24);
const normalize = value => value.normalize("NFD").replace(/\p{M}/gu, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]/g, "");

// Limit cleanup to the original fixture IDs; never replace venues, reviews or
// linked bookings. In particular, an owner-renamed venue keeps its name/photos.
export function cleanLegacyCourtLabels(court) {
    const changes = {};
    const name = court.name.replace(/^DEMO\s*[·:-]\s*/i, "");
    const address = (court.address || "").replace(/^Điểm demo \d+,\s*/i, "");
    if (name !== court.name) changes.name = name;
    if (address !== (court.address || "")) changes.address = address.charAt(0).toUpperCase() + address.slice(1);
    const amenities = (court.amenities || []).filter(value => !/^Dữ liệu demo$/i.test(value.trim()));
    if (amenities.length !== (court.amenities || []).length) changes.amenities = amenities;
    if (/^Sân (giả lập )?để kiểm thử tìm kiếm và đặt lịch\./.test(court.description || "")) {
        const remaining = court.description
            .replace(/^Sân (giả lập )?để kiểm thử tìm kiếm và đặt lịch\.\s*/, "")
            .replace(/^Đây không phải địa điểm kinh doanh thực tế; tên, địa chỉ và tọa độ chỉ dùng minh hoạ\.\s*/, "")
            .trim();
        changes.description = remaining || `${name}. Xem khung giờ trống và chọn lịch chơi phù hợp.`;
    }
    return changes;
}

export async function importMapCourts({ entries = MAP_COURTS, days = 30, dryRun = false } = {}) {
    if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error("Schedule days must be between 1 and 90.");
    if (new Set(entries.map(entry => entry.key)).size !== entries.length) throw new Error("Duplicate import keys.");
    const existing = await Court.find().lean();
    const legacyIds = new Set(DEMO_COURTS.map(court => court._id));
    const changes = existing.filter(court => legacyIds.has(String(court._id)))
        .map(court => ({ court, fields: cleanLegacyCourtLabels(court) }))
        .filter(change => Object.keys(change.fields).length);
    const legacyLanes = await SubCourt.find({ courtId: { $in: [...legacyIds] }, name: /^Sân demo \d+$/ }).lean();
    for (const lane of legacyLanes) {
        const name = lane.name.replace("Sân demo ", "Sân ");
        const duplicate = await SubCourt.exists({ courtId: lane.courtId, name, status: { $in: ["AVAILABLE", "MAINTENANCE"] }, _id: { $ne: lane._id } });
        if (duplicate && lane.status !== "HIDDEN") throw new Error(`Sub-court rename would conflict: ${lane._id}`);
    }

    const plan = [];
    for (const entry of entries) {
        const { key, aliases = [], sources, ...data } = entry;
        const id = importedCourtId(key);
        const names = new Set([entry.name, ...aliases].map(normalize));
        const matches = existing.filter(court => String(court._id) === id || names.has(normalize(court.name)));
        if (matches.length > 1) throw new Error(`Ambiguous venue match: ${entry.name}`);
        const previous = matches[0];
        if (previous && plan.some(item => String(item.id) === String(previous._id))) throw new Error(`Two entries refer to the same court: ${entry.name}`);
        // Validate all new documents before making the first database change.
        if (!previous) await new Court({ ...data, _id: id }).validate();
        plan.push({ id: previous?._id || id, data, previous, managed: !previous || String(previous._id) === id });
    }
    const summary = {
        created: plan.filter(item => !item.previous).map(item => item.data.name),
        existing: plan.filter(item => item.previous).map(item => item.previous.name),
        cleanedCourts: changes.length, cleanedSubCourts: legacyLanes.length, scheduleDays: days
    };
    if (dryRun) return { ...summary, dryRun: true };

    await Promise.all([Court.init(), SubCourt.init(), CourtSlot.init()]);
    for (const { court, fields } of changes) {
        // Compare the old fields so a concurrent admin edit is never overwritten.
        const filter = { _id: court._id, ...Object.fromEntries(Object.keys(fields).map(key => [key, court[key]])) };
        const result = await Court.updateOne(filter, { $set: fields }, { runValidators: true });
        if (!result.matchedCount) throw new Error(`Court changed during cleanup; rerun import: ${court._id}`);
    }
    for (const lane of legacyLanes) {
        await SubCourt.updateOne({ _id: lane._id, name: lane.name }, { $set: { name: lane.name.replace("Sân demo ", "Sân ") } }, { runValidators: true });
    }
    for (const item of plan) {
        if (!item.previous) await Court.updateOne({ _id: item.id }, { $setOnInsert: item.data }, { upsert: true, runValidators: true });
        // Existing venues keep their own lanes and opening hours. Import-owned
        // lanes use stable IDs so retrying a partial import is safe.
        if (item.managed && item.data.status === "AVAILABLE") {
            for (let number = 1; number <= 2; number++) {
                const id = importedCourtId(`lane-${item.id}-${number}`);
                const name = `Sân ${String(number).padStart(2, "0")}`;
                if (!await SubCourt.exists({ courtId: item.id, $or: [{ _id: id }, { name }] })) {
                    await SubCourt.updateOne({ _id: id }, { $setOnInsert: { courtId: item.id, name, status: "AVAILABLE" } }, { upsert: true, runValidators: true });
                }
            }
            await regenerateSlotsForCourt(item.id, days);
        }
    }
    return { ...summary, courts: await Court.countDocuments(), slots: await CourtSlot.countDocuments({ courtId: { $in: plan.map(item => item.id) } }) };
}
