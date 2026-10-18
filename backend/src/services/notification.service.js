import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import mailUtil from "../utils/mail.util.js";

const clients = new Map();

const writeEvent = (res, notification) => {
    res.write(`event: notification\n`);
    res.write(`data: ${JSON.stringify(notification)}\n\n`);
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

        return () => {
            const bucket = clients.get(key);
            if (bucket) {
                bucket.delete(res);
                if (bucket.size === 0) clients.delete(key);
            }
        };
    }

    emitToUser(userId, notification) {
        const bucket = clients.get(`user:${userId}`);
        if (!bucket) return;
        for (const res of bucket) writeEvent(res, notification);
    }

    emitToAdmin(userId, notification) {
        const bucket = clients.get(`admin:${userId}`);
        if (!bucket) return;
        for (const res of bucket) writeEvent(res, notification);
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
        const limit = Math.min(parseInt(query.limit, 10) || 20, 100);
        const filter = { userId: user.id };
        if (query.isRead !== undefined) filter.isRead = query.isRead === "true";

        const [notifications, unreadCount] = await Promise.all([
            Notification.find(filter).sort({ createdAt: -1 }).limit(limit),
            Notification.countDocuments({ userId: user.id, isRead: false })
        ]);

        return { notifications, unreadCount };
    }

    async markRead(user, notificationId) {
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, userId: user.id },
            { $set: { isRead: true } },
            { new: true }
        );
        if (!notification) throw new Error("Không tìm thấy thông báo!");
        return notification;
    }

    async markAllRead(user) {
        await Notification.updateMany({ userId: user.id, isRead: false }, { $set: { isRead: true } });
        return { message: "Đã đánh dấu tất cả thông báo là đã đọc!" };
    }

    async deleteNotification(user, notificationId) {
        const deleted = await Notification.findOneAndDelete({ _id: notificationId, userId: user.id });
        if (!deleted) throw new Error("Không tìm thấy thông báo!");
        return { message: "Đã xóa thông báo!" };
    }
}

export default new NotificationService();
