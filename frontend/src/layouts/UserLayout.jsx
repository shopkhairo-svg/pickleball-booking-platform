// src/layouts/UserLayout.jsx
import { Outlet } from "react-router-dom";

/**
 * Layout bao bọc các trang của User (profile, v.v.)
 * Sử dụng MainLayout bên ngoài (đã được cấu hình trong routes),
 * UserLayout chỉ cần render Outlet để nhúng page content vào.
 */
export default function UserLayout() {
    return <Outlet />;
}
