// src/services/adminService.js
import axiosClient from "../api/axios";

const adminService = {
    // ======================== COURTS ========================
    getCourts: (params) => axiosClient.get("/admin/courts", { params }),
    getCourtById: (id) => axiosClient.get(`/admin/courts/${id}`),
    createCourt: (formData) =>
        axiosClient.post("/admin/courts", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }),
    updateCourt: (id, formData) =>
        axiosClient.put(`/admin/courts/${id}`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }),
    // Xóa 1 ảnh cụ thể khỏi sân (Cloudinary + DB) — encode publicId để xử lý slash
    deleteCourtImage: (courtId, publicId) =>
        axiosClient.delete(`/admin/courts/${courtId}/images/${encodeURIComponent(publicId)}`),
    deleteCourt: (id) => axiosClient.delete(`/admin/courts/${id}`),
    blockCourt: (id) => axiosClient.put(`/admin/courts/${id}/block`),

    // ======================== BOOKINGS ========================
    getBookings: (params) => axiosClient.get("/admin/bookings", { params }),
    confirmBooking: (id) => axiosClient.put(`/admin/bookings/${id}/confirm`),
    completeBooking: (id) => axiosClient.put(`/admin/bookings/${id}/complete`),
    cancelBooking: (id, cancelReason) =>
        axiosClient.put(`/admin/bookings/${id}/cancel`, { cancelReason }),

    // ======================== EQUIPMENT ========================
    getEquipments: (params) => axiosClient.get("/admin/equipments", { params }),
    createEquipment: (data) => axiosClient.post("/admin/equipments", data),
    updateEquipment: (id, data) => axiosClient.put(`/admin/equipments/${id}`, data),
    deleteEquipment: (id) => axiosClient.delete(`/admin/equipments/${id}`),
    stockIn: (id, quantity) => axiosClient.put(`/admin/equipments/${id}/stock-in`, { quantity }),
    getEquipmentRentals: (id) => axiosClient.get(`/admin/equipments/${id}/rentals`),

    // ======================== IMPORT ORDERS ========================
    createImportOrder: (data) => axiosClient.post("/admin/import-orders", data),
    getImportOrders: (params) => axiosClient.get("/admin/import-orders", { params }),
    cancelImportOrder: (id) => axiosClient.put(`/admin/import-orders/${id}/cancel`),

    // ======================== MAINTENANCE ========================
    getMaintenance: (params) => axiosClient.get("/admin/maintenance", { params }),
    createMaintenance: (data) => axiosClient.post("/admin/maintenance", data),
    updateMaintenanceStatus: (id, status) =>
        axiosClient.put(`/admin/maintenance/${id}/status`, { status }),
    getSubCourts: (courtId) => axiosClient.get(`/admin/courts/${courtId}/subcourts`),
    createSubCourt: (courtId, data) => axiosClient.post(`/admin/courts/${courtId}/subcourts`, data),
    updateSubCourt: (id, data) => axiosClient.put(`/admin/subcourts/${id}`, data),
    deleteSubCourt: (id) => axiosClient.delete(`/admin/subcourts/${id}`),

    // ======================== ANALYTICS ========================
    getDashboardStats: () => axiosClient.get("/admin/analytics/dashboard"),
    getRevenueStats: (params) => axiosClient.get("/admin/analytics/revenue", { params }),
    getEquipmentStats: () => axiosClient.get("/admin/analytics/equipment-stats"),
    getPeakHours: () => axiosClient.get("/admin/analytics/peak-hours"),

    // ======================== SETTINGS ========================
    getSettings: () => axiosClient.get("/admin/settings"),
    updateSettings: (data) => axiosClient.put("/admin/settings", data),

    // ======================== USERS ========================
    getUsers: (params) => axiosClient.get("/admin/users", { params }),
    getUserDetail: (id) => axiosClient.get(`/admin/users/${id}`),
    toggleUserStatus: (id) => axiosClient.put(`/admin/users/${id}/toggle-status`),
    updateUserRole: (id, data) => axiosClient.put(`/admin/users/${id}/role`, data),
};

export default adminService;
