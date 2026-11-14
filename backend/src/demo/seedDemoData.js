import bcrypt from "bcryptjs";
import Court from "../models/court.model.js";
import CourtSlot from "../models/courtSlot.model.js";
import SubCourt from "../models/subCourt.model.js";
import User from "../models/user.model.js";
import { regenerateSlotsForCourt } from "../utils/slotScheduler.js";
import { distanceKm } from "../utils/coordinates.js";
import { DEMO_CENTER, DEMO_COURTS, DEMO_USERS, demoSubCourts } from "./demoData.js";

export async function seedDemoData({ accounts, days = 30 }) {
    if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error("Demo schedule days must be between 1 and 90.");
    if (!Array.isArray(accounts) || accounts.length !== DEMO_USERS.length) throw new Error("Two demo account credentials are required.");
    for (const expected of DEMO_USERS) {
        const supplied = accounts.find(account => account.email === expected.email);
        if (!supplied || supplied._id !== expected._id || typeof supplied.password !== "string" || supplied.password.length < 16) {
            throw new Error("Demo credentials do not match the reserved account IDs or password requirements.");
        }
        const existing = await User.findOne({ $or: [{ _id: expected._id }, { email: expected.email }] });
        if (existing && (String(existing._id) !== expected._id || existing.email !== expected.email || existing.role !== "USER" || !await bcrypt.compare(supplied.password, existing.password))) {
            throw new Error("A demo user already exists with different credentials/ownership. Restore the local credentials file; existing users will not be overwritten.");
        }
    }
    // Preflight all reserved IDs before inserting any data. Never adopt an unrelated record.
    for (const court of DEMO_COURTS) {
        if (distanceKm(DEMO_CENTER.latitude, DEMO_CENTER.longitude, court.latitude, court.longitude) > DEMO_CENTER.radius) throw new Error("Demo court is outside the configured radius.");
        const existing = await Court.findById(court._id);
        if (existing && (existing.name !== court.name || existing.vendorId)) throw new Error("A reserved demo court ID was changed. Existing courts will not be overwritten.");
        for (const sub of demoSubCourts(court)) {
            const lane = await SubCourt.findById(sub._id);
            if (lane && (String(lane.courtId) !== sub.courtId || lane.name !== sub.name)) throw new Error("A reserved demo sub-court ID was changed.");
        }
    }
    await Promise.all([User.init(), Court.init(), SubCourt.init(), CourtSlot.init()]);
    for (const expected of DEMO_USERS) {
        const supplied = accounts.find(account => account.email === expected.email);
        const existing = await User.exists({ _id: expected._id });
        if (!existing) await User.updateOne({ _id: expected._id }, { $setOnInsert: { ...expected, password: await bcrypt.hash(supplied.password, 12), role: "USER", status: "ACTIVE" } }, { upsert: true, runValidators: true });
    }
    for (const court of DEMO_COURTS) {
        await Court.updateOne({ _id: court._id }, { $setOnInsert: court }, { upsert: true, runValidators: true });
        for (const sub of demoSubCourts(court)) await SubCourt.updateOne({ _id: sub._id }, { $setOnInsert: sub }, { upsert: true, runValidators: true });
        await regenerateSlotsForCourt(court._id, days);
    }
    const courtIds = DEMO_COURTS.map(court => court._id);
    return {
        center: DEMO_CENTER,
        courts: DEMO_COURTS.map(court => ({ id: court._id, name: court.name, distanceKm: Number(distanceKm(DEMO_CENTER.latitude, DEMO_CENTER.longitude, court.latitude, court.longitude).toFixed(2)) })),
        users: DEMO_USERS.map(({ _id, email }) => ({ id: _id, email })),
        subCourts: await SubCourt.countDocuments({ courtId: { $in: courtIds } }),
        slots: await CourtSlot.countDocuments({ courtId: { $in: courtIds } }),
        scheduleDays: days
    };
}
