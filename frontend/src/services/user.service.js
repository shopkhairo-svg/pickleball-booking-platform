// src/services/user.service.js
import axiosClient from "../api/axios";

export const userService = {
    // Lấy thông tin hồ sơ cá nhân hiện tại
    getMyProfile: () => axiosClient.get("/users/profile"),

    // Cập nhật hồ sơ cá nhân (tên, SĐT, avatar)
    updateMyProfile: (formData) =>
        axiosClient.put("/users/profile", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }),

    // Lấy lịch sử đặt sân của chính mình
    getMyBookings: () => axiosClient.get("/bookings/my-bookings"),

    // Hủy một đơn đặt sân
    cancelMyBooking: (bookingId, cancelReason) =>
        axiosClient.put(`/bookings/${bookingId}/cancel`, { cancelReason }),

    // Lấy danh sách thiết bị/dụng cụ cho thuê (lọc theo courtId nếu có)
    getEquipments: (courtId = null) => {
        const url = courtId ? `/bookings/equipments?courtId=${courtId}` : "/bookings/equipments";
        return axiosClient.get(url);
    },

    // Tạo đơn đặt sân mới
    createBooking: (bookingData) => axiosClient.post("/bookings", bookingData),

    // Lấy thông tin thanh toán chuyển khoản
    getPaymentIntent: (bookingId) => axiosClient.get(`/bookings/${bookingId}/payment-intent`),

    // Xác thực thanh toán thành công
    confirmPayment: (bookingId, paymentMethod) =>
        axiosClient.post(`/bookings/${bookingId}/verify-payment`, { paymentMethod }),
};
