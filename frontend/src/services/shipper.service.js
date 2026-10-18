import axiosClient from "../api/axios";

export const shipperService = {
    getDeliveries: async (params) => {
        return await axiosClient.get("/shipper/deliveries", { params });
    },
    updateDeliveryStatus: async (id, formData) => {
        return await axiosClient.put(`/shipper/deliveries/${id}/status`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    },
    getDeliveryDetail: async (id) => {
        return await axiosClient.get(`/shipper/deliveries/${id}`);
    }
};
export default shipperService;
