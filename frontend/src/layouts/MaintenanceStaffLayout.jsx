import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import NotificationBell from "@/components/NotificationBell";
import { useAuthStore } from "../store/authStore";

export default function MaintenanceStaffLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, clearAuth } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        clearAuth();
        localStorage.removeItem("refreshToken");
        navigate("/login");
    };

    const menuItems = [
        {
            path: "/maintenance-staff",
            label: "Công việc bảo trì",
            icon: "construction",
        },
        {
            path: "/maintenance-staff/profile",
            label: "Hồ sơ cá nhân",
            icon: "account_circle",
        }
    ];

    return (
        <div className="flex h-screen bg-[#f6f7f4]">
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside
                className={`fixed lg:static inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                } flex flex-col border-r border-zinc-200/50 bg-white`}
            >
                <div className="flex items-center gap-3 border-b border-zinc-200/50 px-6 py-5">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">construction</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-base leading-tight text-zinc-900">PickleballPro</h1>
                        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Maintenance Portal</p>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden ml-auto p-1.5 rounded-lg hover:bg-zinc-100"
                    >
                        <span className="material-symbols-outlined text-[18px] text-zinc-400">close</span>
                    </button>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === "/maintenance-staff"}
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

                <div className="border-t border-zinc-200/50 px-4 py-4">
                    <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary-container text-xs font-bold text-primary">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                                user?.fullName?.charAt(0)?.toUpperCase() || "M"
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-zinc-800">{user?.fullName || "Thợ bảo trì"}</p>
                            <p className="truncate text-[10px] text-zinc-400">{user?.email}</p>
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

            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-16 items-center justify-between border-b border-zinc-200/50 bg-white px-4 shadow-sm lg:px-8">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="rounded-lg p-2 hover:bg-zinc-50 lg:hidden"
                    >
                        <span className="material-symbols-outlined text-[24px] text-zinc-500">menu</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="hidden text-xs text-zinc-400 sm:block">Ca bảo trì hôm nay,</span>
                        <span className="text-xs font-bold text-primary">{user?.fullName || "Thợ bảo trì"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 border border-zinc-100">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                                <span className="text-xs font-bold text-primary">
                                    {user?.fullName?.charAt(0)?.toUpperCase() || "M"}
                                </span>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-grow overflow-y-auto bg-[#fafbf9] p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
