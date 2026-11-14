import Court from "../models/court.model.js";
import SubCourt from "../models/subCourt.model.js";
import CourtSlot from "../models/courtSlot.model.js";
import systemSettingService from "../services/systemSetting.service.js";
import { slotTimes } from "./slotTimes.js";
import { vietnamDate } from "./courtQuery.js";

const courtJobs = new Map();
function queueCourt(courtId, job) {
    const key = String(courtId);
    const previous = courtJobs.get(key) || Promise.resolve();
    const current = previous.catch(() => {}).then(job);
    courtJobs.set(key, current);
    return current.finally(() => { if (courtJobs.get(key) === current) courtJobs.delete(key); });
}

const overlaps = (first, second) => first.startTime < second.endTime && first.endTime > second.startTime;

async function daysAhead() {
    const value = Number(await systemSettingService.getSetting("slotDaysAhead").catch(() => 30));
    return Number.isInteger(value) && value > 0 ? Math.min(value, 90) : 30;
}

async function generate(court, subCourts, days) {
    const times = slotTimes(court);
    if (!subCourts.length) return;
    const now = new Date();
    const today = vietnamDate(now);
    const currentTime = now.toLocaleTimeString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", hour12: false });
    // Only remove free obsolete slots; a concurrent booking claim wins atomically.
    await CourtSlot.deleteMany({
        courtId: court._id, subCourtId: { $in: subCourts.map(sub => sub._id) }, isBooked: false,
        $or: [{ date: { $gt: today } }, { date: today, startTime: { $gt: currentTime } }],
        $nor: times.map(time => ({ startTime: time.startTime, endTime: time.endTime }))
    });
    for (let i = 0; i < days; i++) {
        const date = vietnamDate(new Date(now.getTime() + i * 86400000));
        const existingFilter = { courtId: court._id, subCourtId: { $in: subCourts.map(sub => sub._id) }, date };
        let existing = await CourtSlot.find(existingFilter).lean();
        const occupied = existing.filter(slot => slot.isBooked);
        const conflicts = existing.filter(slot => !slot.isBooked && (date > today || slot.startTime > currentTime) && occupied.some(booked => String(booked.subCourtId) === String(slot.subCourtId) && overlaps(slot, booked)));
        if (conflicts.length) {
            await CourtSlot.deleteMany({ _id: { $in: conflicts.map(slot => slot._id) }, isBooked: false });
            existing = await CourtSlot.find(existingFilter).lean();
        }
        const operations = subCourts.flatMap(sub => times.filter(time =>
            !existing.some(slot => String(slot.subCourtId) === String(sub._id) && overlaps(slot, time))
        ).map(time => ({ updateOne: {
            filter: { subCourtId: sub._id, date, startTime: time.startTime },
            update: { $setOnInsert: { courtId: court._id, subCourtId: sub._id, date, ...time, isBooked: false } },
            upsert: true
        } })));
        if (operations.length) {
            try { await CourtSlot.bulkWrite(operations, { ordered: false }); }
            catch (error) {
                // A second scheduler can race an upsert; the unique slot index remains authoritative.
                if (!error.writeErrors?.length || error.writeErrors.some(item => item.code !== 11000)) throw error;
            }
        }
    }
}

let running = false;
export async function runSlotGenerationJob() {
    if (running) return;
    running = true;
    try {
        const days = await daysAhead();
        const courts = await Court.find({ status: "AVAILABLE" }).select("_id").lean();
        for (const court of courts) {
            try {
                await regenerateSlotsForCourt(court._id, days);
            } catch (error) { console.error("[Slots] Court", String(court._id), error.message); }
        }
    } catch (error) { console.error("[Slots]", error.message); }
    finally { running = false; }
}

export function startSlotScheduler() {
    void runSlotGenerationJob();
    // Retry partial failures and newly enabled courts promptly; upserts are idempotent.
    const timer = setInterval(runSlotGenerationJob, 5 * 60000);
    timer.unref();
    return timer;
}

export async function generateSlotsForNewSubCourt(courtId, subCourt) {
    return queueCourt(courtId, async () => {
        const [court, currentSub] = await Promise.all([Court.findById(courtId), SubCourt.findById(subCourt._id)]);
        if (!court || court.status !== "AVAILABLE" || !currentSub || currentSub.status !== "AVAILABLE") return;
        await generate(court, [currentSub], await daysAhead());
    });
}

export async function regenerateSlotsForCourt(courtId, days) {
    return queueCourt(courtId, async () => {
        // Load after acquiring the local queue to avoid an outdated schedule snapshot.
        const court = await Court.findById(courtId);
        if (!court || court.status !== "AVAILABLE") return;
        const subs = await SubCourt.find({ courtId, status: "AVAILABLE" });
        await generate(court, subs, days ?? await daysAhead());
    });
}
