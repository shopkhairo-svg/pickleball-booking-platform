import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Remove the former cross-tab credentials once; sessionStorage is tab-scoped.
if (typeof window !== "undefined") {
    window.localStorage.removeItem("pickleball-auth-storage");
    window.localStorage.removeItem("refreshToken");
}

// Access tokens stay in memory; user info and auth state persist only for this tab.
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
            name: "pickleball-auth-storage-tab",
            // Each browser tab owns an independent identity and refresh token.
            storage: createJSONStorage(() => sessionStorage),
            // Access token remains memory-only.
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated
                // accessToken bị loại ra khỏi danh sách persist
            })
        }
    )
);