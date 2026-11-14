import { randomUUID } from "node:crypto";
import Booking from "../models/booking.model.js";
import mailUtils from "../utils/mail.util.js";

export const bookingStart = booking => booking.startsAt ? new Date(booking.startsAt) : new Date(`${booking.bookingDate}T${booking.startTime}:00+07:00`);
export const reminderIsDue = (booking, now) => booking.status === "CONFIRMED" && !booking.reminderSentAt
    && bookingStart(booking) > now && bookingStart(booking) - now <= 30 * 60000;

// One-minute polling, persistent claims and retries; SMTP delivery is at-least-once.
export async function runBookingReminders({ model = Booking, mail = mailUtils, now, clock = () => new Date() } = {}) {
    mail.assertConfigured();
    // A fixed `now` is useful for tests; production refreshes the clock for every claim.
    const getNow = now === undefined ? clock : () => new Date(now);
    const startedAt = getNow();
    const day = date => date.toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
    const available = at => ({
        status: "CONFIRMED", reminderSentAt: null,
        $and: [
            { $or: [{ reminderLeaseUntil: null }, { reminderLeaseUntil: { $lte: at } }] },
            { $or: [{ reminderRetryAt: null }, { reminderRetryAt: { $lte: at } }] }
        ]
    });
    const query = {
        ...available(startedAt),
        bookingDate: { $in: [...new Set([day(startedAt), day(new Date(+startedAt + 30 * 60000))])] }
    };
    const candidates = await model.find(query).sort({ bookingDate: 1, startTime: 1 }).lean();
    for (const candidate of candidates) {
        const claimTime = getNow();
        if (!reminderIsDue(candidate, claimTime)) continue;
        const claim = randomUUID();
        const booking = await model.findOneAndUpdate({ ...available(claimTime), _id: candidate._id }, {
            $set: { reminderClaim: claim, reminderLeaseUntil: new Date(+claimTime + 5 * 60000) }, $inc: { reminderAttempts: 1 }
        }, { new: true }).populate("userId", "fullName email").populate("courtId", "name address location");
        if (!booking) continue;
        try {
            // Recheck cancellation and start time after waiting for other emails.
            const checkTime = getNow();
            const current = await model.findOne({
                _id: booking._id, status: "CONFIRMED", reminderSentAt: null,
                reminderClaim: claim, reminderLeaseUntil: { $gt: checkTime }
            });
            const sendTime = getNow();
            if (!current || current.reminderLeaseUntil <= sendTime || !reminderIsDue(current, sendTime)) {
                await model.updateOne({ _id: booking._id, reminderClaim: claim }, { $unset: { reminderClaim: 1, reminderLeaseUntil: 1 } });
                continue;
            }
            if (!booking.userId?.email) throw new Error("Booking user has no email");
            await mail.sendBookingReminder(booking);
            await model.updateOne({ _id: booking._id, reminderClaim: claim }, {
                $set: { reminderSentAt: getNow() }, $unset: { reminderClaim: 1, reminderLeaseUntil: 1, reminderRetryAt: 1 }
            });
        } catch (error) {
            await model.updateOne({ _id: booking._id, reminderClaim: claim }, {
                $set: { reminderRetryAt: new Date(+getNow() + 2 * 60000) }, $unset: { reminderClaim: 1, reminderLeaseUntil: 1 }
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
