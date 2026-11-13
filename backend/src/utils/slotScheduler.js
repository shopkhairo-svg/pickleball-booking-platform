import Court from "../models/court.model.js";
import SubCourt from "../models/subCourt.model.js";
import CourtSlot from "../models/courtSlot.model.js";
import systemSettingService from "../services/systemSetting.service.js";
import { slotTimes } from "./slotTimes.js";

async function daysAhead() {
    const value = Number(await systemSettingService.getSetting("slotDaysAhead").catch(() => 30));
    return Number.isInteger(value) && value > 0 ? Math.min(value, 90) : 30;
}

async function generate(court, subCourts, days) {
    const times = slotTimes(court);
    for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() + i * 86400000).toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
        const operations = subCourts.flatMap(sub => times.map(time => ({ updateOne: {
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
        const courts = await Court.find({ status: "AVAILABLE" });
        for (const court of courts) {
            try {
                const subs = await SubCourt.find({ courtId: court._id, status: "AVAILABLE" });
                await generate(court, subs, days);
            } catch (error) { console.error("[Slots] Court", String(court._id), error.message); }
        }
    } catch (error) { console.error("[Slots]", error.message); }
    finally { running = false; }
}

export function startSlotScheduler() {
    void runSlotGenerationJob();
    // Hourly reconciliation also covers newly enabled courts and timezone/day rollovers.
    const timer = setInterval(runSlotGenerationJob, 3600000);
    timer.unref();
    return timer;
}

export async function generateSlotsForNewSubCourt(courtId, subCourt) {
    const court = await Court.findById(courtId);
    if (!court || court.status !== "AVAILABLE" || subCourt.status !== "AVAILABLE") return;
    await generate(court, [subCourt], await daysAhead());
}
