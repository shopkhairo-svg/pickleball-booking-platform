import axiosClient from "../api/axios";

export const notificationService = {
    getNotifications: () => axiosClient.get("/notifications"),
    markRead: (id) => axiosClient.put(`/notifications/${id}/read`),
    markAllRead: () => axiosClient.put("/notifications/read-all"),
    deleteNotification: (id) => axiosClient.delete(`/notifications/${id}`),
};
