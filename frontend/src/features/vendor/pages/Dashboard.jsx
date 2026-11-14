import UnderDevelopment from "@/components/UnderDevelopment";
import { useEffect, useState } from "react";
import { vendorService } from "@/services/vendor.service";

// ─── Dashboard cho Chủ sân (COURT vendor) ───────────────────────────────────
function CourtVendorDashboard({ stats }) {
    const formatCurrency = (v) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v || 0);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="admin-page-title">Tổng quan sân của bạn</h1>
                <p className="admin-page-subtitle">Số liệu đặt sân, doanh thu và đánh giá từ khách hàng.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="admin-card p-6 flex items-center gap-4">
                    <div className="p-2.5 bg-blue-500/8 rounded-xl text-blue-600 shrink-0">
                        <span className="material-symbols-outlined text-[22px]">sports_tennis</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Tổng số sân nhỏ</p>
                        <h3 className="text-xl font-bold text-zinc-900 mt-1 leading-none">{stats?.totalSubCourts || 0} sân</h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{stats?.totalCourts || 0} cụm sân</p>
                    </div>
                </div>

                <div className="admin-card p-6 flex items-center gap-4">
                    <div className="p-2.5 bg-amber-500/8 rounded-xl text-amber-600 shrink-0">
                        <span className="material-symbols-outlined text-[22px]">calendar_month</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Tổng lượt đặt sân</p>
                        <h3 className="text-xl font-bold text-zinc-900 mt-1 leading-none">{stats?.totalBookings || 0} lượt</h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{stats?.pendingBookings || 0} chờ xác nhận</p>
                    </div>
                </div>

                <div className="admin-card p-6 flex items-center gap-4">
                    <div className="p-2.5 bg-emerald-500/8 rounded-xl text-emerald-600 shrink-0">
                        <span className="material-symbols-outlined text-[22px]">payments</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Doanh thu</p>
                        <h3 className="text-lg font-bold text-zinc-900 mt-1 leading-none">{formatCurrency(stats?.totalRevenue)}</h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{stats?.completedBookings || 0} đơn hoàn thành</p>
                    </div>
                </div>

                <div className="admin-card p-6 flex items-center gap-4">
                    <div className="p-2.5 bg-yellow-500/8 rounded-xl text-yellow-600 shrink-0">
                        <span className="material-symbols-outlined text-[22px]">star</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Đánh giá trung bình</p>
                        <h3 className="text-xl font-bold text-zinc-900 mt-1 leading-none">
                            {stats?.averageRating ? `${stats.averageRating} ★` : "Chưa có"}
                        </h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{stats?.totalReviews || 0} lượt đánh giá</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chi tiết trạng thái booking */}
                <div className="admin-card p-6 space-y-6">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b pb-3 border-zinc-100">
                        Chi tiết trạng thái đặt sân
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-zinc-500">Hoàn thành:</span>
                            <span className="text-emerald-600 font-bold">{stats?.completedBookings || 0} lượt</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-zinc-500">Đã xác nhận:</span>
                            <span className="text-blue-600 font-bold">{stats?.confirmedBookings || 0} lượt</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-zinc-500">Chờ xác nhận:</span>
                            <span className="text-amber-500 font-bold">{stats?.pendingBookings || 0} lượt</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-zinc-500">Đã hủy:</span>
                            <span className="text-red-500 font-bold">{stats?.cancelledBookings || 0} lượt</span>
                        </div>
                        <div className="border-t border-zinc-100 pt-4 flex justify-between items-center text-xs font-bold">
                            <span className="text-zinc-900">Tổng doanh thu:</span>
                            <span className="text-primary text-sm font-bold">{formatCurrency(stats?.totalRevenue)}</span>
                        </div>
                    </div>
                </div>

                {/* Biểu đồ doanh thu theo tháng */}
                <div className="lg:col-span-2 admin-card p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b pb-3 border-zinc-100">
                            Doanh thu theo tháng (năm {new Date().getFullYear()})
                        </h3>
                    </div>

                    {!stats?.monthlyRevenue || stats?.monthlyRevenue?.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 text-zinc-400 text-xs">
                            <span className="material-symbols-outlined text-3xl mb-2">bar_chart</span>
                            Chưa có dữ liệu doanh thu trong năm nay.
                        </div>
                    ) : (
                        <div className="mt-6 flex flex-col gap-4">
                            {stats?.monthlyRevenue?.map((item, idx) => {
                                const maxRevenue = Math.max(...stats.monthlyRevenue.map(m => m.revenue), 1);
                                const percentage = Math.round((item.revenue / maxRevenue) * 100);
                                return (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between text-[11px] font-bold">
                                            <span className="text-zinc-500">{item.month}</span>
                                            <span className="text-zinc-800 font-bold">
                                                {formatCurrency(item.revenue)} ({item.bookings} lượt)
                                            </span>
                                        </div>
                                        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Equipment vendors are handled by the development screen.
export default function VendorDashboard() {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        vendorService.getStats()
            .then(res => {
                if (res.success) {
                    setStats(res.stats);
                }
            })
            .catch(err => {
                setError(err.response?.data?.message || "Không thể tải số liệu thống kê!");
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50/50 border border-red-200/50 text-red-700 p-4 rounded-xl text-xs font-semibold">
                {error}
            </div>
        );
    }

    // Chọn dashboard phù hợp theo vendorType trả về từ API
    if (stats?.vendorType === "COURT") {
        return <CourtVendorDashboard stats={stats} />;
    }

    return <UnderDevelopment />;
}
