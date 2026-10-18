import axiosClient from "../api/axios";

export const vendorService = {
    // Stats
    getStats: async () => {
        return await axiosClient.get("/vendor/stats");
    },

    // Courts
    getCourts: async () => {
        return await axiosClient.get("/vendor/courts");
    },
    createCourt: async (formData) => {
        return await axiosClient.post("/vendor/courts", formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
    },
    updateCourt: async (id, formData) => {
        return await axiosClient.put(`/vendor/courts/${id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
    },
    deleteCourt: async (id) => {
        return await axiosClient.delete(`/vendor/courts/${id}`);
    },

    // Equipments
    getEquipments: async () => {
        return await axiosClient.get("/vendor/equipments");
    },
    createEquipment: async (data) => {
        return await axiosClient.post("/vendor/equipments", data);
    },
    updateEquipment: async (id, data) => {
        return await axiosClient.put(`/vendor/equipments/${id}`, data);
    },
    deleteEquipment: async (id) => {
        return await axiosClient.delete(`/vendor/equipments/${id}`);
    },
    getEquipmentRentals: async (id) => {
        return await axiosClient.get(`/vendor/equipments/${id}/rentals`);
    },

    // Bookings
    getBookings: async (status = "") => {
        const url = status ? `/vendor/bookings?status=${status}` : "/vendor/bookings";
        return await axiosClient.get(url);
    },
    prepareBooking: async (id) => {
        return await axiosClient.put(`/vendor/bookings/${id}/prepare`);
    },
    returnEquipment: async (id, items) => {
        return await axiosClient.put(`/vendor/bookings/${id}/return-equipment`, { items });
    },

    // Reviews
    getReviews: async () => {
        return await axiosClient.get("/vendor/reviews");
    },

    // Import Orders
    getImportOrders: async () => {
        return await axiosClient.get("/vendor/import-orders");
    },
    confirmImportOrder: async (id) => {
        return await axiosClient.put(`/vendor/import-orders/${id}/confirm`);
    },
    completeImportOrder: async (id) => {
        return await axiosClient.put(`/vendor/import-orders/${id}/complete`);
    },
    cancelImportOrder: async (id) => {
        return await axiosClient.put(`/vendor/import-orders/${id}/cancel`);
    },
    getShippers: async () => {
        return await axiosClient.get("/vendor/shippers");
    },
    assignShipper: async (id, shipperId) => {
        return await axiosClient.put(`/vendor/import-orders/${id}/assign-shipper`, { shipperId });
    },
    confirmDeliveryCompleted: async (id) => {
        return await axiosClient.put(`/vendor/deliveries/${id}/confirm-completed`);
    },

    // Maintenance
    getMaintenance: async () => {
        return await axiosClient.get("/vendor/maintenance");
    },
    getMaintenanceStaff: async (targetType = "") => {
        const query = targetType ? `?targetType=${targetType}` : "";
        return await axiosClient.get(`/vendor/maintenance-staff${query}`);
    },
    assignMaintenanceStaff: async (id, staffId) => {
        return await axiosClient.put(`/vendor/maintenance/${id}/assign-staff`, { staffId });
    },
    updateMaintenanceStatus: async (id, status) => {
        return await axiosClient.put(`/vendor/maintenance/${id}/status`, { status });
    },
    getSubCourts: async (courtId) => {
        return await axiosClient.get(`/vendor/courts/${courtId}/subcourts`);
    },
    createSubCourt: async (courtId, data) => {
        return await axiosClient.post(`/vendor/courts/${courtId}/subcourts`, data);
    },
    updateSubCourt: async (id, data) => {
        return await axiosClient.put(`/vendor/subcourts/${id}`, data);
    },
    deleteSubCourt: async (id) => {
        return await axiosClient.delete(`/vendor/subcourts/${id}`);
    }
};
