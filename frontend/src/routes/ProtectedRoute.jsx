// src/routes/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

/**
 * Route bảo vệ: Chỉ cho phép user đã đăng nhập + đúng role truy cập
 * @param {string} requiredRole - "ADMIN" hoặc "USER"
 */
export default function ProtectedRoute({ requiredRole }) {
    const { isAuthenticated, user } = useAuthStore();

    // Chưa đăng nhập → đá về trang Login
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    // Đã đăng nhập nhưng không đúng role → đá về trang chủ
    if (requiredRole && user.role !== requiredRole) {
        return <Navigate to="/" replace />;
    }

    // Hợp lệ → render children routes
    return <Outlet />;
}
