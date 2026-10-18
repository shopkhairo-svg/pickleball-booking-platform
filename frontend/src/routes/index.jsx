import { createBrowserRouter, Navigate } from "react-router-dom";
import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";
import ForgotPassword from "../features/auth/pages/ForgotPassword";
import RoleProfile from "../features/profile/pages/RoleProfile.jsx";

import MainLayout from "../layouts/MainLayout.jsx";
import Home from "../features/home/pages/Home";
import CourtList from "../features/court/pages/CourtList";
import CourtDetail from "../features/court/pages/CourtDetail";

// 👤 User imports
import UserProfile from "../features/user/pages/UserProfile.jsx";
import Favorites from "../features/user/pages/Favorites.jsx";
import RewardPage from "../features/user/pages/RewardPage.jsx";

// 🛡️ Admin imports
import ProtectedRoute from "./ProtectedRoute.jsx";
import AdminLayout from "../layouts/AdminLayout.jsx";
import Dashboard from "../features/admin/pages/Dashboard.jsx";
import CourtManagement from "../features/admin/pages/CourtManagement.jsx";
import BookingManagement from "../features/admin/pages/BookingManagement.jsx";
import EquipmentManagement from "../features/admin/pages/EquipmentManagement.jsx";
import MaintenanceManagement from "../features/admin/pages/MaintenanceManagement.jsx";
import UserManagement from "../features/admin/pages/UserManagement.jsx";
import CouponManagement from "../features/admin/pages/CouponManagement.jsx";
import Settings from "../features/admin/pages/Settings.jsx";
import ReviewManagement from "../features/admin/pages/ReviewManagement.jsx";

// 🏬 Vendor imports
import VendorLayout from "../layouts/VendorLayout.jsx";
import VendorDashboard from "../features/vendor/pages/Dashboard.jsx";
import VendorCourtManagement from "../features/vendor/pages/CourtManagement.jsx";
import VendorEquipmentManagement from "../features/vendor/pages/EquipmentManagement.jsx";
import VendorBookingManagement from "../features/vendor/pages/BookingManagement.jsx";
import VendorReviews from "../features/vendor/pages/Reviews.jsx";
import VendorMaintenanceManagement from "../features/vendor/pages/MaintenanceManagement.jsx";

// 🚚 Shipper imports
import ShipperLayout from "../layouts/ShipperLayout.jsx";
import ShipperDashboard from "../features/shipper/pages/ShipperDashboard.jsx";

// 🛠️ Maintenance staff imports
import MaintenanceStaffLayout from "../layouts/MaintenanceStaffLayout.jsx";
import MaintenanceStaffDashboard from "../features/maintenance-staff/pages/MaintenanceDashboard.jsx";


export const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/register",
        element: <Register />,
    },
    {
        path: "/forgot-password",
        element: <ForgotPassword />,
    },
    {
        // 🎯 KHUNG TRỤ CỘT BAO BỌC CHO TOÀN BỘ CÁC TRANG XEM SÂN CÔNG KHAI
        path: "/",
        element: <MainLayout />,
        children: [
            {
                path: "/",
                element: <Home />,
            },
            {
                path: "/courts",
                element: <CourtList />,
            },
            {
                path: "/courts/:id",
                element: <CourtDetail />,
            }
        ]
    },
    {
        // 👤 Trang hồ sơ user - yêu cầu đăng nhập, dùng MainLayout bên ngoài
        path: "/user",
        element: <ProtectedRoute />,
        children: [
            {
                element: <MainLayout />,
                children: [
                    {
                        path: "profile",
                        element: <UserProfile />,
                    },
                    {
                        path: "favorites",
                        element: <Favorites />,
                    },
                    {
                        path: "rewards",
                        element: <RewardPage />,
                    },
                ],
            },
        ],
    },
    {
        // 🛡️ Group các route Admin được bảo vệ bởi ProtectedRoute
        path: "/admin",
        element: <ProtectedRoute requiredRole="ADMIN" />,
        children: [
            {
                element: <AdminLayout />,
                children: [
                    {
                        index: true,
                        element: <Dashboard />,
                    },
                    {
                        path: "courts",
                        element: <CourtManagement />,
                    },
                    {
                        path: "bookings",
                        element: <BookingManagement />,
                    },
                    {
                        path: "equipments",
                        element: <EquipmentManagement />,
                    },
                    {
                        path: "maintenance",
                        element: <MaintenanceManagement />,
                    },
                    {
                        path: "users",
                        element: <UserManagement />,
                    },
                    {
                        path: "coupons",
                        element: <CouponManagement />,
                    },
                    {
                        path: "reviews",
                        element: <ReviewManagement />,
                    },
                    {
                        path: "settings",
                        element: <Settings />,
                    },
                    {
                        path: "profile",
                        element: <RoleProfile />,
                    },
                ],
            },
        ],
    },
    {
        // 🏬 Group các route Vendor được bảo vệ bởi ProtectedRoute
        path: "/vendor",
        element: <ProtectedRoute requiredRole="VENDOR" />,
        children: [
            {
                element: <VendorLayout />,
                children: [
                    {
                        index: true,
                        element: <VendorDashboard />,
                    },
                    {
                        path: "courts",
                        element: <VendorCourtManagement />,
                    },
                    {
                        path: "bookings",
                        element: <VendorBookingManagement />,
                    },
                    {
                        path: "equipments",
                        element: <VendorEquipmentManagement />,
                    },
                    {
                        path: "reviews",
                        element: <VendorReviews />,
                    },
                    {
                        path: "maintenance",
                        element: <VendorMaintenanceManagement />,
                    },
                    {
                        path: "profile",
                        element: <RoleProfile />,
                    },
                ],
            },
        ],
    },
    {
        // 🚚 Group các route Shipper được bảo vệ bởi ProtectedRoute
        path: "/shipper",
        element: <ProtectedRoute requiredRole="SHIPPER" />,
        children: [
            {
                element: <ShipperLayout />,
                children: [
                    {
                        index: true,
                        element: <ShipperDashboard />,
                    },
                    {
                        path: "profile",
                        element: <RoleProfile />,
                    },
                ],
            },
        ],
    },
    {
        path: "/maintenance-staff",
        element: <ProtectedRoute requiredRole="MAINTENANCE_STAFF" />,
        children: [
            {
                element: <MaintenanceStaffLayout />,
                children: [
                    {
                        index: true,
                        element: <MaintenanceStaffDashboard />,
                    },
                    {
                        path: "profile",
                        element: <RoleProfile />,
                    },
                ],
            },
        ],
    },
    // Tự động đá về trang /login nếu người dùng gõ bậy URL không tồn tại
    {
        path: "*",
        element: <Navigate to="/login" replace />,
    },
]);
