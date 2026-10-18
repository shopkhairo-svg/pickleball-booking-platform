import notificationService from "../services/notification.service.js";

class NotificationController {
    stream(req, res) {
        const unregister = notificationService.registerStream(req.user, res);
        req.on("close", unregister);
    }

    async getNotifications(req, res) {
        try {
            const result = await notificationService.getNotifications(req.user, req.query);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async markRead(req, res) {
        try {
            const notification = await notificationService.markRead(req.user, req.params.id);
            return res.status(200).json({ success: true, notification });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async markAllRead(req, res) {
        try {
            const result = await notificationService.markAllRead(req.user);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async deleteNotification(req, res) {
        try {
            const result = await notificationService.deleteNotification(req.user, req.params.id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }
}

export default new NotificationController();
