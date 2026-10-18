import { useEffect, useState } from "react";
import adminService from "../../../services/adminService";

const StatCard = ({ title, value, icon, color, subtext }) => (
    <div className="admin-card p-6 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{title}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 leading-none">{value}</p>
            </div>
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${color}`}>
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>
        </div>
        {subtext && (
            <div className="mt-4 pt-3 border-t border-zinc-100/80">
                <p className="text-[11px] font-medium text-zinc-500 leading-normal">{subtext}</p>
            </div>
        )}
    </div>
);

const StatusBadge = ({ status, count }) => {
    const colors = {
        PENDING: "bg-amber-500/8 text-amber-700 border-amber-200/50",
        CONFIRMED: "bg-blue-500/8 text-blue-700 border-blue-200/50",
        COMPLETED: "bg-emerald-500/8 text-emerald-700 border-emerald-200/50",
        CANCELLED: "bg-red-500/8 text-red-700 border-red-200/50",
    };
    return (
        <div className="flex items-center justify-between gap-3 py-2.5 border-b border-zinc-100 last:border-0 last:pb-0">
            <span className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-bold tracking-wider ${colors[status] || "border-zinc-200 bg-zinc-50 text-zinc-600"}`}>
                {status}
            </span>
            <span className="text-xs font-bold text-zinc-800">{count}</span>
        </div>
    );
};

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [revenueData, setRevenueData] = useState(null);
    const [peakHours, setPeakHours] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const [dashRes, revRes, peakRes] = await Promise.all([
                    adminService.getDashboardStats(),
                    adminService.getRevenueStats(),
                    adminService.getPeakHours(),
                ]);
                setStats(dashRes);
                setRevenueData(revRes);
                setPeakHours(peakRes);
            } catch (err) {
                console.error("Dashboard error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-64 animate-pulse rounded-xl bg-zinc-200" />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(item => <div key={item} className="h-36 animate-pulse rounded-2xl bg-white" />)}
                </div>
            </div>
        );
    }

    const formatMoney = (num) => num ? num.toLocaleString("vi-VN") + "đ" : "0đ";

    return (
        <div className="space-y-8">
            <div>
                <h1 className="admin-page-title">Dashboard tổng quan</h1>
                <p className="admin-page-subtitle">Theo dõi doanh thu, booking, dòng tiền và hiệu suất sân.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <StatCard title="Tổng số sân" value={stats?.totalCourts || 0} icon="sports_tennis" color="bg-primary/8 text-primary" />
                <StatCard title="Tổng booking" value={stats?.totalBookings || 0} icon="event_available" color="bg-blue-500/8 text-blue-600" />
                <StatCard
                    title="Tổng doanh thu"
                    value={formatMoney(stats?.totalRevenue)}
                    icon="payments"
                    color="bg-amber-500/8 text-amber-600"
                    subtext={`Sân: ${formatMoney(stats?.courtRevenue)} | Đồ: ${formatMoney(stats?.equipmentRevenue)}`}
                />
                <StatCard
                    title="Khách hàng"
                    value={stats?.totalUsers || 0}
                    icon="group"
                    color="bg-purple-500/8 text-purple-600"
                    subtext={`${stats?.newReviewCount || 0} đánh giá mới`}
                />
                <StatCard
                    title="Đối tác (Vendor)"
                    value={stats?.totalVendors || 0}
                    icon="store"
                    color="bg-emerald-500/8 text-emerald-600"
                    subtext="Chủ cụm sân"
                />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="admin-card p-6">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Tỷ lệ lấp đầy sân</h3>
                    <div className="mt-5 flex items-center gap-5">
                        <div className="grid h-20 w-20 place-items-center rounded-full border-8 border-primary/10 text-lg font-bold text-primary">
                            {stats?.occupancyRate || 0}%
                        </div>
                        <div className="text-xs text-zinc-500">
                            <p className="mb-1"><span className="font-bold text-zinc-800">{stats?.bookedSlots || 0}</span> slot đã đặt</p>
                            <p><span className="font-bold text-zinc-800">{stats?.totalSlots || 0}</span> tổng slot</p>
                        </div>
                    </div>
                </div>

                <div className="admin-card p-6">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Trạng thái booking</h3>
                    <div className="space-y-1">
                        {stats?.bookingStatusBreakdown?.length ? stats.bookingStatusBreakdown.map(item => (
                            <StatusBadge key={item._id} status={item._id} count={item.count} />
                        )) : <p className="py-4 text-center text-xs text-zinc-400">Chưa có dữ liệu</p>}
                    </div>
                </div>

                <div className="admin-card p-6">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Giờ cao điểm</h3>
                    <div className="space-y-3">
                        {peakHours?.peakHours?.slice(0, 5).map((item, idx) => (
                            <div key={item._id} className="flex items-center gap-3">
                                <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{idx + 1}</span>
                                <span className="flex-1 text-xs font-semibold text-zinc-700">{item._id}</span>
                                <span className="text-xs font-bold text-primary">{item.count} lượt</span>
                            </div>
                        ))}
                        {(!peakHours?.peakHours || peakHours.peakHours.length === 0) && (
                            <p className="py-4 text-center text-xs text-zinc-400">Chưa có dữ liệu</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="admin-card overflow-hidden">
                <div className="border-b border-zinc-100 px-6 py-5">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Doanh thu 30 ngày gần nhất</h3>
                </div>
                {revenueData?.data?.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#fafbf9]">
                                <tr>
                                    <th className="table-head-cell">Ngày</th>
                                    <th className="table-head-cell text-right">Booking</th>
                                    <th className="table-head-cell text-right">Doanh thu sân</th>
                                    <th className="table-head-cell text-right">Thiết bị</th>
                                    <th className="table-head-cell text-right">Tổng</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {revenueData.data.map(row => (
                                    <tr key={row._id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-4 py-3.5 text-xs font-bold text-zinc-800">{row._id}</td>
                                        <td className="px-4 py-3.5 text-xs text-right text-zinc-600">{row.bookingCount}</td>
                                        <td className="px-4 py-3.5 text-xs text-right text-zinc-600">{formatMoney(row.courtRevenue)}</td>
                                        <td className="px-4 py-3.5 text-xs text-right text-zinc-600">{formatMoney(row.equipmentRevenue)}</td>
                                        <td className="px-4 py-3.5 text-xs text-right font-bold text-primary">{formatMoney(row.totalRevenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="py-10 text-center text-xs text-zinc-400">Chưa có dữ liệu doanh thu trong 30 ngày qua</p>
                )}
            </div>
        </div>
    );
}
