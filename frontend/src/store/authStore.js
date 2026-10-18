import { create } from "zustand";
import { persist } from "zustand/middleware";

// ✅ Fix #12: AccessToken KHÔNG được persist vào localStorage (dễ bị XSS đánh cắp)
// Chỉ lưu user info & isAuthenticated vào localStorage, accessToken chỉ sống trong memory
// Khi refresh trang → cần gọi /auth/refresh-token để lấy accessToken mới

export const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            accessToken: null,      // Chỉ trong memory, KHÔNG persist
            isAuthenticated: false,

            // Hàm xử lý kích hoạt trạng thái khi đăng nhập thành công
            setAuth: (user, accessToken) =>
                set({
                    user,
                    accessToken,
                    isAuthenticated: true
                }),

            // Hàm dọn sạch kho đồ khi người dùng bấm Đăng xuất (Logout)
            clearAuth: () =>
                set({
                    user: null,
                    accessToken: null,
                    isAuthenticated: false
                }),
        }),
        {
            name: "pickleball-auth-storage",
            // ✅ Fix #12: Chỉ persist user + isAuthenticated, KHÔNG persist accessToken
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated
                // accessToken bị loại ra khỏi danh sách persist
            })
        }
    )
);