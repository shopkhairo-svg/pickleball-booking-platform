import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import mailUtil from "../utils/mail.util.js";
import mongoose from "mongoose";

const clients = new Map();

const writeEvent = (res, notification) => {
    res.write(`event: notification\n`);
    res.write(`data: ${JSON.stringify(notification)}\n\n`);
};

const notificationIdOrThrow = id => {
    if (!mongoose.isObjectIdOrHexString(id)) {
        throw Object.assign(new Error("Mã thông báo không hợp lệ!"), { status: 400 });
    }
};

const emit = (key, notification) => {
    const bucket = clients.get(key);
    if (!bucket) return;
    for (const res of bucket) {
        try {
            if (res.destroyed || res.writableEnded) bucket.delete(res);
            else writeEvent(res, notification);
        } catch {
            bucket.delete(res);
            res.destroy?.();
        }
    }
    if (!bucket.size) clients.delete(key);
};

class NotificationService {
    registerStream(user, res) {
        const key = user.role === "ADMIN" ? `admin:${user.id}` : `user:${user.id}`;
        if (!clients.has(key)) clients.set(key, new Set());

        clients.get(key).add(res);

        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no"
        });
        res.write(`event: ready\n`);
        res.write(`data: ${JSON.stringify({ ok: true })}\n\n`);

        const unregister = () => {
            clearInterval(heartbeat);
            clearTimeout(expiration);
            const bucket = clients.get(key);
            if (bucket) {
                bucket.delete(res);
                if (bucket.size === 0) clients.delete(key);
            }
        };
        // Keep idle streams alive behind Nginx and close them when their JWT expires.
        const heartbeat = setInterval(() => {
            try {
                if (res.destroyed || res.writableEnded) unregister();
                else res.write(": keep-alive\n\n");
            } catch {
                unregister();
                res.destroy?.();
            }
        }, 25000);
        heartbeat.unref();
        const expiration = user.exp ? setTimeout(() => {
            unregister();
            res.end();
        }, Math.max(0, user.exp * 1000 - Date.now())) : undefined;
        expiration?.unref();
        res.once("close", unregister);
        return unregister;
    }

    emitToUser(userId, notification) {
        emit(`user:${userId}`, notification);
    }

    emitToAdmin(userId, notification) {
        emit(`admin:${userId}`, notification);
    }

    async createForUser({ userId, title, message, type = "SYSTEM", referenceId = null, referenceType = null, sendMail = false }) {
        const notification = await Notification.create({
            userId,
            title,
            content: message,
            message,
            type,
            referenceId,
            referenceType,
            recipientRole: "USER"
        });

        this.emitToUser(userId.toString(), notification);

        if (sendMail) {
            try {
                const user = await User.findById(userId).select("email fullName");
                if (user?.email) {
                    await mailUtil.sendGenericNotificationEmail(user.email, user.fullName, title, message);
                }
            } catch (error) {
                console.error("[MAIL_NOTIFICATION_USER]", error.message);
            }
        }

        return notification;
    }

    async createForAdmins({ title, message, type = "SYSTEM", referenceId = null, referenceType = null, sendMail = false }) {
        const admins = await User.find({ role: "ADMIN", status: "ACTIVE" }).select("_id email fullName");
        const notifications = [];

        for (const admin of admins) {
            const notification = await Notification.create({
                userId: admin._id,
                title,
                content: message,
                message,
                type,
                referenceId,
                referenceType,
                recipientRole: "ADMIN"
            });
            notifications.push(notification);
            this.emitToAdmin(admin._id.toString(), notification);

            if (sendMail && admin.email) {
                try {
                    await mailUtil.sendGenericNotificationEmail(admin.email, admin.fullName, title, message);
                } catch (error) {
                    console.error("[MAIL_NOTIFICATION_ADMIN]", error.message);
                }
            }
        }

        return notifications;
    }

    async createForRole({ role, title, message, type = "SYSTEM", referenceId = null, referenceType = null, sendMail = false }) {
        const users = await User.find({ role, status: "ACTIVE" }).select("_id email fullName");
        const notifications = [];

        for (const user of users) {
            const notification = await Notification.create({
                userId: user._id,
                title,
                content: message,
                message,
                type,
                referenceId,
                referenceType,
                recipientRole: role
            });
            notifications.push(notification);
            this.emitToUser(user._id.toString(), notification);

            if (sendMail && user.email) {
                try {
                    await mailUtil.sendGenericNotificationEmail(user.email, user.fullName, title, message);
                } catch (error) {
                    console.error(`[MAIL_NOTIFICATION_${role}]`, error.message);
                }
            }
        }

        return notifications;
    }

    async getNotifications(user, query = {}) {
        const limit = query.limit === undefined ? 20 : Number(query.limit);
        if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
            throw Object.assign(new Error("Số lượng thông báo phải là số nguyên từ 1 đến 100!"), { status: 400 });
        }
        if (query.isRead !== undefined && !["true", "false"].includes(query.isRead)) {
            throw Object.assign(new Error("Bộ lọc đã đọc phải là true hoặc false!"), { status: 400 });
        }
        const filter = { userId: user.id };
        if (query.isRead !== undefined) filter.isRead = query.isRead === "true";

        const [notifications, unreadCount] = await Promise.all([
            Notification.find(filter).sort({ createdAt: -1 }).limit(limit),
            Notification.countDocuments({ userId: user.id, isRead: false })
        ]);

        return { notifications, unreadCount };
    }

    async markRead(user, notificationId) {
        notificationIdOrThrow(notificationId);
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, userId: user.id },
            { $set: { isRead: true } },
            { new: true }
        );
        if (!notification) throw Object.assign(new Error("Không tìm thấy thông báo!"), { status: 404 });
        return notification;
    }

    async markAllRead(user) {
        await Notification.updateMany({ userId: user.id, isRead: false }, { $set: { isRead: true } });
        return { message: "Đã đánh dấu tất cả thông báo là đã đọc!" };
    }

    async deleteNotification(user, notificationId) {
        notificationIdOrThrow(notificationId);
        const deleted = await Notification.findOneAndDelete({ _id: notificationId, userId: user.id });
        if (!deleted) throw Object.assign(new Error("Không tìm thấy thông báo!"), { status: 404 });
        return { message: "Đã xóa thông báo!" };
    }
}

export default new NotificationService();
