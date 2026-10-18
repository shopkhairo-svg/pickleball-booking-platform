import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import NotificationBell from "@/components/NotificationBell";

export default function VendorLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, clearAuth } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        clearAuth();
        navigate("/login");
    };

    // Phân chia menu items động theo loại Vendor
    const isCourtVendor = user?.vendorType === "COURT" || !user?.vendorType;
    const filteredMenuItems = [
        {
            path: "/vendor",
            label: "Dashboard",
            icon: "dashboard",
        },
        ...(isCourtVendor
            ? [
                  {
                      path: "/vendor/courts",
                      label: "Quản lý Sân",
                      icon: "sports_tennis",
                  },
                  {
                      path: "/vendor/reviews",
                      label: "Đánh giá",
                      icon: "star",
                  },
              ]
            : [
                  {
                      path: "/vendor/equipments",
                      label: "Cung cấp Thiết bị",
                      icon: "local_shipping",
                  },
              ]),
        {
            path: "/vendor/maintenance",
            label: "Bảo trì được giao",
            icon: "build",
        },
        {
            path: "/vendor/profile",
            label: "Hồ sơ cá nhân",
            icon: "account_circle",
        },
    ];

    return (
        <div className="flex h-screen bg-[#f6f7f4]">
            {/* Overlay mobile */}
            {sidebarOpen && (
                <div
                     className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                     onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                } flex flex-col border-r border-zinc-200/50 bg-white`}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 border-b border-zinc-200/50 px-6 py-5">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">storefront</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-base leading-tight text-zinc-900">PickleballPro</h1>
                        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                            {isCourtVendor ? "Vendor Chủ sân" : "Vendor Thiết bị"}
                        </p>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden ml-auto p-1.5 rounded-lg hover:bg-zinc-100"
                    >
                        <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {filteredMenuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === "/vendor"}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all duration-200 ${
                                    isActive
                                        ? "bg-primary text-white shadow-sm"
                                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                                }`
                            }
                        >
                            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* User Info */}
                <div className="border-t border-zinc-200/50 px-4 py-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary-container text-xs font-bold text-primary">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                                user?.fullName?.charAt(0)?.toUpperCase() || "V"
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-zinc-800 truncate">{user?.fullName || "Vendor"}</p>
                            <p className="text-[10px] text-zinc-400 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50/50 hover:bg-red-50 border border-red-100/50 px-4 py-2.5 text-xs font-bold text-red-600 transition-all active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header className="flex h-16 items-center justify-between border-b border-zinc-200/50 bg-white px-4 shadow-sm lg:px-8">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 rounded-lg hover:bg-zinc-50"
                    >
                        <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400 hidden sm:block">Chào mừng trở lại, đối tác</span>
                        <span className="text-xs font-bold text-primary">{user?.fullName || "Vendor"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-zinc-100">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                                <span className="text-xs font-bold text-primary">
                                    {user?.fullName?.charAt(0)?.toUpperCase() || "V"}
                                </span>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-grow overflow-y-auto bg-[#fafbf9] p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
