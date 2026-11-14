import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

const emails = [];
mock.module("nodemailer", { defaultExport: {
    createTransport() { return { async sendMail(options) { emails.push(options); return { messageId: "test-only" }; } }; }
} });
mock.module("../src/models/notification.model.js", { defaultExport: {
    async findOneAndUpdate() { return null; },
    async findOneAndDelete() { return null; }
} });
mock.module("../src/models/review.model.js", { defaultExport: {
    async create() { throw Object.assign(new Error("Mongo duplicate key"), { code: 11000 }); }
} });
mock.module("../src/models/booking.model.js", { defaultExport: {
    async findOne() { return { bookingCode: "BK-TEST" }; }
} });
mock.module("../src/repositories/user.repository.js", { defaultExport: {
    async update(id, data) { return { _id: id, ...data }; }
} });
const { default: notifications } = await import("../src/services/notification.service.js");
const { default: reviews } = await import("../src/services/review.service.js");
const { default: users } = await import("../src/services/user.service.js");
const { default: mail } = await import("../src/utils/mail.util.js");

test("closed SSE clients cannot abort delivery to the remaining clients", t => {
    const response = () => Object.assign(new EventEmitter(), {
        chunks: [], writeHead() {},
        write(chunk) { if (this.broken) throw new Error("Disconnected socket"); this.chunks.push(chunk); },
        destroy() { this.destroyed = true; this.emit("close"); }
    });
    const broken = response();
    const healthy = response();
    const stopBroken = notifications.registerStream({ id: "stream-test", role: "USER" }, broken);
    const stopHealthy = notifications.registerStream({ id: "stream-test", role: "USER" }, healthy);
    t.after(() => { stopBroken(); stopHealthy(); });
    broken.broken = true;
    assert.doesNotThrow(() => notifications.emitToUser("stream-test", { title: "Test" }));
    assert.equal(broken.destroyed, true);
    assert.ok(healthy.chunks.some(chunk => chunk.includes('"title":"Test"')));
});

test("notification filters and IDs reject malformed input before database access", async () => {
    for (const query of [{ limit: -1 }, { limit: "abc" }, { limit: "2.5" }, { limit: "101" }, { isRead: "unexpected" }]) {
        await assert.rejects(() => notifications.getNotifications({ id: "test" }, query), { status: 400 });
    }
    await assert.rejects(() => notifications.markRead({ id: "test" }, "invalid"), { status: 400 });
    await assert.rejects(() => notifications.deleteNotification({ id: "test" }, {}), { status: 400 });
    await assert.rejects(() => notifications.markRead({ id: "test" }, "507f1f77bcf86cd799439011"), { status: 404 });
    await assert.rejects(() => notifications.deleteNotification({ id: "test" }, "507f1f77bcf86cd799439011"), { status: 404 });
});

test("review duplicate races return a conflict instead of exposing MongoDB errors", async () => {
    await assert.rejects(() => reviews.createReview("test", { bookingId: "test", courtId: "test", rating: 5 }), error => {
        assert.equal(error.status, 409);
        assert.equal(error.message.includes("Mongo"), false);
        return true;
    });
});

test("review administration validates filters before querying MongoDB", async () => {
    for (const query of [{ status: {} }, { status: "INVALID" }, { courtId: "invalid" }]) {
        await assert.rejects(() => reviews.getAdminReviews(query), { status: 400 });
    }
    await assert.rejects(() => reviews.updateReviewStatus("test", {}));
});

test("profile rejects malformed fields and supports clearing an optional phone", async () => {
    for (const payload of [{ fullName: {} }, { fullName: "" }, { fullName: "a".repeat(101) }, { phone: {} }, { phone: "invalid-phone" }]) {
        await assert.rejects(() => users.updateUserProfile("test", payload));
    }
    assert.equal((await users.updateUserProfile("test", { phone: null })).user.phone, null);
    assert.equal((await users.updateUserProfile("test", { phone: "+84 912345678" })).user.phone, "+84 912345678");
});

test("email templates escape untrusted profile and notification text", async t => {
    for (const [key, value] of Object.entries({ MAIL_HOST: "smtp.example.invalid", MAIL_USER: "test@example.invalid", MAIL_PASSWORD: "test-password" })) {
        const previous = process.env[key];
        process.env[key] = value;
        t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
    }
    const name = '<a href="https://example.invalid">click</a>';
    await mail.sendOTPEmail("player@example.invalid", name, "123456");
    await mail.sendForgotPasswordOTPEmail("player@example.invalid", name, "123456");
    await mail.sendGenericNotificationEmail("player@example.invalid", name, "<b>Title</b>", "<img src=x>");
    assert.equal(emails.length, 3);
    for (const email of emails) {
        assert.equal(email.html.includes(name), false);
        assert.ok(email.html.includes("&lt;a href=&quot;"));
    }
    assert.ok(emails[2].html.includes("&lt;img src=x&gt;"));
});
