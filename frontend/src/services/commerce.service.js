import axiosClient from "../api/axios";

export const commerceService = {
    getPointWallet: () => axiosClient.get("/points/wallet"),
    getAvailableCoupons: (orderValue) =>
        axiosClient.get("/coupons/available", { params: { orderValue } }),
    validateCoupon: ({ code, orderValue, courtId }) =>
        axiosClient.post("/coupons/validate", { code, orderValue, courtId }),
    getAdminCoupons: (params = {}) => axiosClient.get("/coupons/admin", { params }),
    createCoupon: (payload) => axiosClient.post("/coupons/admin", payload),
    updateCoupon: (id, payload) => axiosClient.put(`/coupons/admin/${id}`, payload),
    deleteCoupon: (id) => axiosClient.delete(`/coupons/admin/${id}`),
};
