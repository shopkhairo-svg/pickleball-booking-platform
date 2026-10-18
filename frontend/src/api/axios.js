// src/api/axios.js
import axios from "axios";
import { useAuthStore } from "../store/authStore";

// Khởi tạo một bản sao Axios cấu hình sẵn Base URL kết nối sang Backend Cổng 5000
const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
});

// 🛡️ TẤM LỌC 1 (Request Interceptor): Tự động đính kèm accessToken vào Header trước khi gửi đi
axiosClient.interceptors.request.use(
    (config) => {
        // Lấy accessToken từ Zustand store (trong memory)
        const token = useAuthStore.getState().accessToken;
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 🛡️ TẤM LỌC 2 (Response Interceptor): Bắt lỗi 401 hoặc 403 để âm thầm đi nạp lại Access Token mới (Silent Refresh)
axiosClient.interceptors.response.use(
    (response) => response.data, // Trả về thẳng dữ liệu sạch, không cần response.data ở ngoài Component nữa
    async (error) => {
        const originalRequest = error.config;

        // Báo lỗi Token hết hạn hoặc không tìm thấy (401 hoặc 403) và request chưa từng thử refresh
        if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
            const refreshToken = localStorage.getItem("refreshToken");

            if (refreshToken) {
                originalRequest._retry = true;
                try {
                    // Gọi API nạp lại Access Token mới tinh từ Backend
                    const res = await axios.post(
                        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/auth/refresh-token`,
                        { refreshToken }
                    );

                    const { accessToken } = res.data;

                    // 🎯 Cập nhật Access Token mới vào Zustand store
                    const currentUser = useAuthStore.getState().user;
                    useAuthStore.getState().setAuth(currentUser, accessToken);

                    // Gắn token mới tinh này vào request cũ bị lỗi lúc nãy rồi cho chạy lại tự động
                    originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
                    return axiosClient(originalRequest);
                } catch (refreshError) {
                    // Nếu ngay cả Refresh Token cũng chết (hết hạn sau 7 ngày) -> Sập toàn bộ phiên, đá người dùng ra trang Login
                    useAuthStore.getState().clearAuth();
                    localStorage.removeItem("refreshToken");
                    window.location.href = "/login";
                    return Promise.reject(refreshError);
                }
            }
        }
        return Promise.reject(error);
    }
);

export default axiosClient;