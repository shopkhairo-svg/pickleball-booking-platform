// src/layouts/MainLayout.jsx
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore.js";
import NotificationBell from "@/components/NotificationBell.jsx";

export default function MainLayout() {
    const navigate = useNavigate();
    const { user, isAuthenticated, clearAuth } = useAuthStore();

    const handleLogout = () => {
        clearAuth();
        localStorage.removeItem("refreshToken");
        navigate("/login");
    };

    const getNavLinkClass = ({ isActive }) => {
        return `inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-bold transition-all duration-200 ${
            isActive
                ? "bg-white text-primary shadow-sm"
                : "text-zinc-600 hover:text-primary hover:bg-white/50"
        }`;
    };

    return (
        <div className="flex min-h-screen flex-col bg-[#fafbf9] text-zinc-900">
            <header className="fixed top-0 z-50 w-full border-b border-zinc-200/50 bg-[#fafbf9]/80 backdrop-blur-md">
                <div className="app-shell">
                    <div className="flex h-16 items-center justify-between gap-4">
                        <Link to="/" className="group flex items-center gap-2.5">
                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white shadow-sm transition-all duration-300 group-hover:scale-105">
                                <span className="material-symbols-outlined text-[20px]">sports_tennis</span>
                            </div>
                            <div className="hidden leading-none sm:block">
                                <span className="block text-base font-bold tracking-tight text-zinc-900">PickleballPro</span>
                                <span className="mt-0.5 block text-[10px] font-medium text-zinc-400">Court booking studio</span>
                            </div>
                        </Link>

                        <nav className="hidden items-center gap-1 rounded-xl bg-zinc-100/70 p-1 md:flex">
                            <NavLink to="/" className={getNavLinkClass} end>
                                <span className="material-symbols-outlined text-[17px]">home</span>
                                Trang chủ
                            </NavLink>
                            <NavLink to="/courts" className={getNavLinkClass}>
                                <span className="material-symbols-outlined text-[17px]">sports_tennis</span>
                                Sân bóng
                            </NavLink>
                            {isAuthenticated && (
                                <NavLink to="/user/favorites" className={getNavLinkClass}>
                                    <span className="material-symbols-outlined text-[17px]">favorite</span>
                                    Yêu thích
                                </NavLink>
                            )}
                            {isAuthenticated && (
                                <NavLink to="/user/rewards" className={getNavLinkClass}>
                                    <span className="material-symbols-outlined text-[17px]">workspace_premium</span>
                                    Ưu đãi
                                </NavLink>
                            )}
                        </nav>

                        <div className="flex items-center gap-2">
                            {isAuthenticated && user ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => navigate("/courts")}
                                        className="hidden items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#0c623c] active:scale-[0.98] lg:inline-flex"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                        Đặt sân
                                    </button>
                                    <NotificationBell />
                                    <Link
                                        to={user.role === "ADMIN" ? "/admin" : "/user/profile"}
                                        className="group flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-1 pr-3 transition-all duration-200 hover:border-primary/20 hover:bg-zinc-50"
                                    >
                                        <div className="relative">
                                            <img
                                                src={user.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=pickle"}
                                                alt={user.fullName || "User avatar"}
                                                className="h-8 w-8 rounded-lg border border-zinc-200 object-cover"
                                            />
                                            <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white bg-emerald-500" />
                                        </div>
                                        <span className="hidden leading-tight sm:block text-left">
                                            <span className="block max-w-24 truncate text-xs font-bold text-zinc-700 group-hover:text-primary">
                                                {user.fullName || "Người dùng"}
                                            </span>
                                            <span className="block text-[9px] font-semibold text-zinc-400">
                                                {user.role === "ADMIN" ? "Admin" : "Người chơi"}
                                            </span>
                                        </span>
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="grid h-9 w-9 place-items-center rounded-xl text-zinc-400 transition-all duration-200 hover:bg-red-50 hover:text-red-500 active:scale-[0.96]"
                                        title="Đăng xuất"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">logout</span>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => navigate("/login")}
                                        className="hidden rounded-xl px-4 py-2 text-sm font-bold text-zinc-600 transition-all duration-200 hover:text-primary md:block"
                                    >
                                        Đăng nhập
                                    </button>
                                    <button onClick={() => navigate("/register")} className="btn-primary px-4 py-2 text-xs">
                                        Đặt sân
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* 🌟 MAIN CONTENT */}
            <main className="flex-grow pt-24 md:pt-16">
                <Outlet />
            </main>

            <footer className="mt-auto w-full border-t border-zinc-200/60 bg-white py-12">
                <div className="app-shell">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                        <div className="col-span-1 md:col-span-1">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
                                    <span className="material-symbols-outlined text-[19px]">sports_tennis</span>
                                </div>
                                <span className="text-base font-bold text-zinc-900">
                                    PickleballPro
                                </span>
                            </div>
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                Đặt sân, thanh toán, thuê dụng cụ và theo dõi lịch chơi trong một trải nghiệm gọn gàng.
                            </p>
                        </div>
                        <div>
                            <h5 className="mb-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Hệ thống</h5>
                            <ul className="space-y-2 text-sm">
                                <li><Link className="text-zinc-500 transition-colors duration-200 hover:text-primary" to="/courts">Danh sách sân</Link></li>
                                <li><Link className="text-zinc-500 transition-colors duration-200 hover:text-primary" to="/user/favorites">Yêu thích</Link></li>
                                <li><Link className="text-zinc-500 transition-colors duration-200 hover:text-primary" to="/user/profile">Hồ sơ</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="mb-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Hỗ trợ</h5>
                            <ul className="space-y-2 text-sm">
                                <li><Link className="text-zinc-500 transition-colors duration-200 hover:text-primary" to="/courts">Liên hệ sân</Link></li>
                                <li><Link className="text-zinc-500 transition-colors duration-200 hover:text-primary" to="/login">Điều khoản sử dụng</Link></li>
                                <li><Link className="text-zinc-500 transition-colors duration-200 hover:text-primary" to="/login">Chính sách bảo mật</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="mb-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Giờ vận hành</h5>
                            <p className="text-sm text-zinc-400 leading-relaxed">Hệ thống đặt sân hoạt động 24/7. Từng cụm sân có giờ mở cửa riêng trong trang chi tiết.</p>
                        </div>
                    </div>
                    <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-zinc-200/50 pt-6 md:flex-row">
                        <p className="text-xs text-zinc-400">© {new Date().getFullYear()} PickleballPro Management.</p>
                        <div className="flex gap-6 text-xs text-zinc-400">
                            <span>Realtime booking</span>
                            <span>Verified reviews</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
