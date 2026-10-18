import mongoose from "mongoose";
import Court from "../models/court.model.js";
import SubCourt from "../models/subCourt.model.js";
import CourtSlot from "../models/courtSlot.model.js";
import systemSettingService from "../services/systemSetting.service.js";

/**
 * Sinh slot cho một ngày + sân cụ thể nếu chưa tồn tại
 */
async function generateSlotsForCourtAndDate(court, subCourts, dateStr) {
    const startH = parseInt(court.openTime?.split(":")[0]) || 6;
    const endH = parseInt(court.closeTime?.split(":")[0]) || 22;
    const slotDurationMin = court.slotDuration || 60;

    const slotsToInsert = [];

    for (const sub of subCourts) {
        let currentHour = startH;
        let currentMin = 0;

        while (true) {
            const totalMinutesStart = currentHour * 60 + currentMin;
            const totalMinutesEnd = totalMinutesStart + slotDurationMin;
            const endHour = Math.floor(totalMinutesEnd / 60);
            const endMin = totalMinutesEnd % 60;

            if (endHour > endH || (endHour === endH && endMin > 0)) break;

            const startStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
            const endStr = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

            const exists = await CourtSlot.exists({
                subCourtId: sub._id,
                courtId: court._id,
                date: dateStr,
                startTime: startStr
            });

            if (!exists) {
                slotsToInsert.push({
                    subCourtId: sub._id,
                    courtId: court._id,
                    date: dateStr,
                    startTime: startStr,
                    endTime: endStr,
                    isBooked: false
                });
            }

            const nextTotalMin = totalMinutesStart + slotDurationMin;
            currentHour = Math.floor(nextTotalMin / 60);
            currentMin = nextTotalMin % 60;
        }
    }

    if (slotsToInsert.length > 0) {
        await CourtSlot.insertMany(slotsToInsert, { ordered: false });
    }

    return slotsToInsert.length;
}

/**
 * Job chính: duyệt tất cả sân AVAILABLE và sinh slot cho N ngày tới
 */
async function runSlotGenerationJob() {
    let daysAhead = 30;
    try {
        const configuredDays = await systemSettingService.getSetting("slotDaysAhead");
        if (configuredDays && !isNaN(configuredDays)) {
            daysAhead = parseInt(configuredDays);
        }
    } catch (err) {
        console.warn("⚠️ Failed to load slotDaysAhead setting, falling back to 30 days:", err.message);
    }

    console.log(`🕐 [SlotScheduler] Bắt đầu sinh slot mới rolling ${daysAhead} ngày...`);

    try {
        const courts = await Court.find({ status: "AVAILABLE" });
        let totalCreated = 0;

        for (const court of courts) {
            const subCourts = await SubCourt.find({ courtId: court._id, status: "AVAILABLE" });
            if (subCourts.length === 0) continue;

            for (let i = 0; i < daysAhead; i++) {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const dateStr = d.toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).split(" ")[0];
                const created = await generateSlotsForCourtAndDate(court, subCourts, dateStr);
                totalCreated += created;
            }
        }

        console.log(`✅ [SlotScheduler] Hoàn tất! Đã sinh thêm ${totalCreated} slot mới cho ${courts.length} sân.`);
    } catch (err) {
        console.error("❌ [SlotScheduler] Lỗi khi sinh slot:", err.message);
    }
}

/**
 * Khởi động scheduler — chạy mỗi 24 giờ, bắt đầu từ 00:05 ngày hôm sau
 */
export function startSlotScheduler() {
    runSlotGenerationJob();

    const scheduleNextRun = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 5, 0, 0); // 00:05 UTC

        const msUntilNextRun = tomorrow.getTime() - now.getTime();

        setTimeout(() => {
            runSlotGenerationJob();
            setInterval(runSlotGenerationJob, 24 * 60 * 60 * 1000);
        }, msUntilNextRun);

        console.log(`🗓️ [SlotScheduler] Lần chạy tiếp theo: ${tomorrow.toISOString()}`);
    };

    scheduleNextRun();
}

export async function generateSlotsForNewSubCourt(courtId, subCourt) {
    const court = await Court.findById(courtId);
    if (!court || court.status !== "AVAILABLE" || subCourt.status !== "AVAILABLE") return;

    let daysAhead = 30;
    try {
        const configuredDays = await systemSettingService.getSetting("slotDaysAhead");
        if (configuredDays && !isNaN(configuredDays)) {
            daysAhead = parseInt(configuredDays);
        }
    } catch (err) {
        console.warn("⚠️ Failed to load slotDaysAhead setting, falling back to 30 days:", err.message);
    }

    const startH = parseInt(court.openTime?.split(":")[0]) || 6;
    const endH = parseInt(court.closeTime?.split(":")[0]) || 22;
    const slotDurationMin = court.slotDuration || 60;

    const runGeneration = async (session = null) => {
        const slotsToInsert = [];
        for (let i = 0; i < daysAhead; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const dateStr = d.toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).split(" ")[0];

            let currentHour = startH;
            let currentMin = 0;
            while (true) {
                const totalMinutesStart = currentHour * 60 + currentMin;
                const totalMinutesEnd = totalMinutesStart + slotDurationMin;
                const endHour = Math.floor(totalMinutesEnd / 60);
                const endMin = totalMinutesEnd % 60;

                if (endHour > endH || (endHour === endH && endMin > 0)) break;

                const startStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
                const endStr = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

                const query = {
                    subCourtId: subCourt._id,
                    courtId: court._id,
                    date: dateStr,
                    startTime: startStr
                };
                const exists = session 
                    ? await CourtSlot.exists(query).session(session)
                    : await CourtSlot.exists(query);

                if (!exists) {
                    slotsToInsert.push({
                        subCourtId: subCourt._id,
                        courtId: court._id,
                        date: dateStr,
                        startTime: startStr,
                        endTime: endStr,
                        isBooked: false
                    });
                }

                const nextTotalMin = totalMinutesStart + slotDurationMin;
                currentHour = Math.floor(nextTotalMin / 60);
                currentMin = nextTotalMin % 60;
            }
        }

        if (slotsToInsert.length > 0) {
            if (session) {
                await CourtSlot.insertMany(slotsToInsert, { ordered: false, session });
            } else {
                await CourtSlot.insertMany(slotsToInsert, { ordered: false });
            }
        }
    };

    let session = null;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        await runGeneration(session);
        await session.commitTransaction();
    } catch (err) {
        if (session) {
            await session.abortTransaction();
        }
        const isReplicaSetError = err.message?.includes("replica set") || err.code === 20 || err.message?.includes("transaction numbers");
        if (isReplicaSetError) {
            console.warn("⚠️ MongoDB Replica Set is not enabled on this environment. Fallback: Generating slots without transaction...");
            try {
                await runGeneration(null);
            } catch (fallbackErr) {
                console.error("❌ Fallback slot generation failed:", fallbackErr.message);
                throw fallbackErr;
            }
        } else {
            console.error("❌ Transactional slot generation failed:", err.message);
            throw err;
        }
    } finally {
        if (session) {
            session.endSession();
        }
    }
}
