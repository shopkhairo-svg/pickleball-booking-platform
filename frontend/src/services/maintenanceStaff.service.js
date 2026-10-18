import axiosClient from "../api/axios";

export const maintenanceStaffService = {
    getMaintenance: async (status = "") => {
        const query = status ? `?status=${status}` : "";
        return await axiosClient.get(`/maintenance-staff/maintenance${query}`);
    },

    updateProgress: async (id, formData) => {
        return await axiosClient.put(`/maintenance-staff/maintenance/${id}/progress`, formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
    }
};

export default maintenanceStaffService;
