// src/services/auth.service.js
import axiosClient from "../api/axios";

export const authService = {
    // 1. Luồng đăng nhập bằng Form thường (Email + Password)
    login: async (email, password) => {
        return await axiosClient.post("/auth/login", { email, password });
    },

    // 2. Luồng đăng nhập bằng Google OAuth2 chính chủ
    googleLogin: async (idToken) => {
        return await axiosClient.post("/auth/google-login", { idToken });
    },

    // 3. Luồng đăng ký tài khoản mới cho khách hàng
    register: async (fullName, email, password) => {
        return await axiosClient.post("/auth/register", { fullName, email, password });
    },
    verifyOTP: async ({ email, otpCode }) => {
        return await axiosClient.post("/auth/verify-otp", { email, otpCode });
    },

    // 4. Luồng yêu cầu gửi mail reset mật khẩu khi bấm "Forgot Password"
    forgotPassword: async (email) => {
        return await axiosClient.post("/auth/forgot-password", { email });
    },
    resetPassword: async ({ email, otpCode, newPassword }) => {
        return await axiosClient.put("/auth/reset-password", { email, otpCode, newPassword });
    },
    // 5. Luồng đăng xuất hệ thống và xóa whitelist token trên Redis
    logout: async () => {
        const refreshToken = localStorage.getItem("refreshToken");
        try {
            // Báo cho Backend biết để quăng cái refreshToken này vào blacklist/xóa khỏi Redis
            await axiosClient.post("/auth/logout", { refreshToken });
        } catch (error) {
            console.error("Lỗi xóa phiên đăng xuất ở Backend:", error);
        } finally {
            // Dù Backend có lỗi hay không, Frontend vẫn phải xóa sạch token local để đảm bảo an toàn
            localStorage.removeItem("refreshToken");
            // Trình kích hoạt xóa kho đồ Zustand sẽ được gọi ở component giao diện sau
        }
    },

};