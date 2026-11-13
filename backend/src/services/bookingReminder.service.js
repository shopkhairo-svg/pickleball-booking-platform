import { randomUUID } from "node:crypto";
import Booking from "../models/booking.model.js";
import mailUtils from "../utils/mail.util.js";

export const bookingStart = booking => booking.startsAt ? new Date(booking.startsAt) : new Date(`${booking.bookingDate}T${booking.startTime}:00+07:00`);
export const reminderIsDue = (booking, now) => booking.status === "CONFIRMED" && !booking.reminderSentAt
    && bookingStart(booking) > now && bookingStart(booking) - now <= 30 * 60000;

// One-minute polling, persistent claims and retries; SMTP delivery is at-least-once.
export async function runBookingReminders({ model = Booking, mail = mailUtils, now = new Date() } = {}) {
    mail.assertConfigured();
    const day = date => date.toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
    const query = {
        status: "CONFIRMED", reminderSentAt: null,
        bookingDate: { $in: [...new Set([day(now), day(new Date(+now + 30 * 60000))])] },
        $and: [
            { $or: [{ reminderLeaseUntil: null }, { reminderLeaseUntil: { $lte: now } }] },
            { $or: [{ reminderRetryAt: null }, { reminderRetryAt: { $lte: now } }] }
        ]
    };
    const candidates = await model.find(query).sort({ startTime: 1 }).lean();
    for (const candidate of candidates) {
        if (!reminderIsDue(candidate, now)) continue;
        const claim = randomUUID();
        const booking = await model.findOneAndUpdate({ ...query, _id: candidate._id }, {
            $set: { reminderClaim: claim, reminderLeaseUntil: new Date(+now + 5 * 60000) }, $inc: { reminderAttempts: 1 }
        }, { new: true }).populate("userId", "fullName email").populate("courtId", "name address location");
        if (!booking) continue;
        try {
            // Recheck cancellation and start time after waiting for other emails.
            const current = await model.findOne({ _id: booking._id, status: "CONFIRMED", reminderClaim: claim });
            if (!current || bookingStart(booking) <= new Date()) {
                await model.updateOne({ _id: booking._id, reminderClaim: claim }, { $unset: { reminderClaim: 1, reminderLeaseUntil: 1 } });
                continue;
            }
            if (!booking.userId?.email) throw new Error("Booking user has no email");
            await mail.sendBookingReminder(booking);
            await model.updateOne({ _id: booking._id, reminderClaim: claim }, {
                $set: { reminderSentAt: new Date() }, $unset: { reminderClaim: 1, reminderLeaseUntil: 1, reminderRetryAt: 1 }
            });
        } catch (error) {
            await model.updateOne({ _id: booking._id, reminderClaim: claim }, {
                $set: { reminderRetryAt: new Date(Date.now() + 2 * 60000) }, $unset: { reminderClaim: 1, reminderLeaseUntil: 1 }
            });
            console.error("[Reminder] Failed:", String(booking._id), error.message);
        }
    }
}

export function startBookingReminders() {
    let running = false;
    let lastError;
    const tick = async () => {
        if (running) return;
        running = true;
        try { await runBookingReminders(); lastError = undefined; }
        catch (error) { if (lastError !== error.message) console.warn("[Reminder]", error.message); lastError = error.message; }
        finally { running = false; }
    };
    void tick();
    const timer = setInterval(tick, 60000);
    timer.unref();
    return timer;
}
