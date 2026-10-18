// src/features/admin/pages/BookingManagement.jsx
import { useState, useEffect } from "react";
import adminService from "../../../services/adminService";

const statusConfig = {
    PENDING:   { label: "Chờ duyệt",    cls: "bg-amber-100 text-amber-700 border border-amber-200" },
    CONFIRMED: { label: "Đã xác nhận",  cls: "bg-blue-100 text-blue-700 border border-blue-200" },
    COMPLETED: { label: "Hoàn thành",   cls: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
    CANCELLED: { label: "Đã hủy",       cls: "bg-red-100 text-red-700 border border-red-200" },
};

const paymentConfig = {
    UNPAID:   { label: "Chưa TT",    cls: "bg-orange-100 text-orange-700" },
    PAID:     { label: "Đã TT",      cls: "bg-green-100 text-green-700" },
    REFUNDED: { label: "Đã hoàn",    cls: "bg-purple-100 text-purple-700" },
};

// ─── Booking Detail Modal ──────────────────────────────────────────────────────
function BookingDetailModal({ booking, onClose }) {
    const status = statusConfig[booking.status] || { label: booking.status, cls: "bg-gray-100 text-gray-600" };
    const payment = paymentConfig[booking.paymentStatus] || { label: booking.paymentStatus, cls: "bg-gray-100 text-gray-600" };
    const formatMoney = (num) => num?.toLocaleString("vi-VN") + "đ";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-2xl shadow-soft w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-5 bg-ink text-white flex-shrink-0 relative">
                    <button onClick={onClose} className="absolute right-4 top-4 text-white/70 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-[22px]">receipt_long</span>
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-lg text-white">Chi tiết đơn đặt sân</h3>
                        <p className="text-white/65 text-xs mt-0.5">Mã đơn: #{booking.bookingCode}</p>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-6 overflow-y-auto custom-scrollbar text-left">
                    {/* User info */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Khách hàng</h4>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                            {booking.userId?.avatar ? (
                                <img src={booking.userId.avatar} alt="" className="w-12 h-12 rounded-xl object-cover border border-gray-200" />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-primary font-bold">
                                    {booking.userId?.fullName?.slice(0, 1).toUpperCase() || "U"}
                                </div>
                            )}
                            <div>
                                <p className="font-bold text-gray-800 text-sm">{booking.userId?.fullName || "N/A"}</p>
                                <p className="text-xs text-gray-500">SĐT: {booking.userId?.phone || "N/A"} | Email: {booking.userId?.email || "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Court & Time */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Thông tin sân đặt</h4>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2.5">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">sports_tennis</span>
                                <div>
                                    <p className="font-bold text-gray-800 text-sm">{booking.courtId?.name || "N/A"}</p>
                                    {booking.courtId?.address && (
                                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                                            {booking.courtId.address}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-2.5 border-t border-gray-200/60 text-xs text-gray-600">
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-gray-400">calendar_month</span>
                                    <span>Ngày chơi: <span className="font-semibold text-gray-800">{booking.bookingDate}</span></span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-gray-400">schedule</span>
                                    <span>Khung giờ: <span className="font-semibold text-primary">{booking.startTime} – {booking.endTime}</span> ({booking.durationHours} giờ)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status & Payment badges */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Trạng thái đơn</h4>
                            <div className={`px-4 py-2.5 rounded-xl text-center text-xs font-bold border ${status.cls}`}>
                                {status.label}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Thanh toán</h4>
                            <div className={`px-4 py-2.5 rounded-xl text-center text-xs font-bold border ${payment.cls}`}>
                                {payment.label}
                            </div>
                        </div>
                    </div>

                    {/* Rented Equipment */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Dụng cụ thuê kèm</h4>
                        {booking.equipmentItems && booking.equipmentItems.length > 0 ? (
                            <div className="space-y-2">
                                {booking.equipmentItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
                                        <div className="flex items-center gap-2.5">
                                            {item.equipmentId?.image ? (
                                                <img src={item.equipmentId.image} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-200" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-primary text-[20px]">sports_tennis</span>
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-bold text-gray-800">{item.equipmentId?.name || "Thiết bị"}</p>
                                                <p className="text-[10px] text-gray-400">
                                                    Đơn giá: {formatMoney(item.rentalPrice)} 
                                                    {item.equipmentId?.rentalType === "HOUR" ? "/giờ" : "/lượt"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-black text-gray-900 text-sm">x{item.quantity}</span>
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                                item.returnStatus === "RETURNED" ? "bg-green-100 text-green-700 border border-green-200" :
                                                item.returnStatus === "DAMAGED" ? "bg-red-100 text-red-700 border border-red-200" :
                                                item.returnStatus === "LOST" ? "bg-gray-100 text-gray-700 border border-gray-200" :
                                                "bg-amber-100 text-amber-700 border border-amber-200"
                                            }`}>
                                                {item.returnStatus === "RENTING" ? "Đang thuê" :
                                                 item.returnStatus === "RETURNED" ? "Đã trả" :
                                                 item.returnStatus === "DAMAGED" ? "Hỏng" : "Mất"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">Không thuê thiết bị kèm theo đơn này.</p>
                        )}
                    </div>

                    {/* Financial Summary */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Chi tiết tài chính</h4>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2.5 text-xs text-gray-600">
                            <div className="flex justify-between">
                                <span>Tiền thuê sân:</span>
                                <span className="font-bold text-gray-800">{formatMoney(booking.courtPrice)}</span>
                            </div>
                            {booking.equipmentPrice > 0 && (
                                <div className="flex justify-between">
                                    <span>Tiền thuê dụng cụ:</span>
                                    <span className="font-bold text-gray-800">{formatMoney(booking.equipmentPrice)}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span>Phí dịch vụ hệ thống (5%):</span>
                                <span className="font-bold text-gray-800">{formatMoney(booking.systemFee)}</span>
                            </div>
                            {booking.discount > 0 && (
                                <div className="flex justify-between text-red-500 font-medium">
                                    <span>Giảm giá mã giảm giá ({booking.couponCode}):</span>
                                    <span className="font-bold">-{formatMoney(booking.discount)}</span>
                                </div>
                            )}
                            {booking.pointDiscount > 0 && (
                                <div className="flex justify-between text-red-500 font-medium">
                                    <span>Giảm giá điểm tích lũy ({booking.pointsUsed} điểm):</span>
                                    <span className="font-bold">-{formatMoney(booking.pointDiscount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2.5 border-t border-gray-200 text-sm font-bold text-gray-900">
                                <span>Tổng cộng thanh toán:</span>
                                <span className="text-primary font-black text-base">{formatMoney(booking.totalPrice)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Cancel Reason */}
                    {booking.status === "CANCELLED" && booking.cancelReason && (
                        <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                            <p className="text-xs font-semibold text-red-500 mb-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px]">info</span>
                                Lý do hủy đơn
                            </p>
                            <p className="text-xs text-gray-700 leading-relaxed font-medium">
                                {booking.cancelReason}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white hover:bg-gray-100 text-gray-700 font-bold border border-gray-200 rounded-xl text-xs transition-all shadow-sm"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Cancel Confirm Modal ─────────────────────────────────────────────────────
function CancelConfirmModal({ booking, onConfirm, onClose }) {
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) return;
        setSubmitting(true);
        await onConfirm(booking._id, reason.trim());
        setSubmitting(false);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-2xl shadow-soft w-full max-w-md overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                    <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-red-500 text-[20px]">warning</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">Hủy đơn đặt sân</h3>
                        <p className="text-xs text-gray-500">#{booking.bookingCode}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {booking.paymentStatus === "PAID" && (
                        <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-200">
                            <span className="material-symbols-outlined text-amber-500 text-[18px] flex-shrink-0">account_balance_wallet</span>
                            <p className="text-xs text-amber-700 font-medium">
                                Đơn này đã thanh toán <span className="font-black">{booking.totalPrice?.toLocaleString("vi-VN")}đ</span>. Hệ thống sẽ tự động chuyển trạng thái sang "Đã hoàn tiền" và thông báo khách hàng.
                            </p>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">
                            Lý do hủy <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Nhập lý do hủy để thông báo đến khách hàng..."
                            rows={3}
                            required
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none transition-all resize-none"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 text-sm"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !reason.trim()}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {submitting ? (
                                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span className="material-symbols-outlined text-[16px]">cancel</span>
                            )}
                            Xác nhận hủy
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BookingManagement() {
    const [bookings, setBookings] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ page: 1, status: "", startDate: "", endDate: "" });

    // Modal states
    const [cancelTarget, setCancelTarget] = useState(null);   // booking đang muốn hủy
    const [detailTarget, setDetailTarget] = useState(null);   // booking muốn xem chi tiết hủy
    const [actionMsg, setActionMsg] = useState({ text: "", type: "" });

    useEffect(() => { fetchBookings(); }, [filters.page, filters.status]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const params = { page: filters.page, limit: 10 };
            if (filters.status) params.status = filters.status;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            const res = await adminService.getBookings(params);
            setBookings(res.bookings);
            setPagination(res.pagination);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const showMsg = (text, type = "success") => {
        setActionMsg({ text, type });
        setTimeout(() => setActionMsg({ text: "", type: "" }), 4000);
    };

    const handleConfirm = async (id) => {
        if (!window.confirm("Xác nhận duyệt đơn đặt sân này?")) return;
        try {
            await adminService.confirmBooking(id);
            showMsg("Đã xác nhận đơn đặt sân!", "success");
            fetchBookings();
        } catch (err) {
            showMsg(err?.response?.data?.message || err.message, "error");
        }
    };

    const handleComplete = async (id) => {
        if (!window.confirm("Xác nhận hoàn tất đơn đặt sân này? Doanh thu sẽ được ghi nhận.")) return;
        try {
            await adminService.completeBooking(id);
            showMsg("Đã hoàn tất đơn đặt sân!", "success");
            fetchBookings();
        } catch (err) {
            showMsg(err?.response?.data?.message || err.message, "error");
        }
    };

    const handleCancelConfirm = async (id, reason) => {
        try {
            const res = await adminService.cancelBooking(id, reason);
            setCancelTarget(null);
            const refundNote = res?.refunded ? " Đã chuyển trạng thái hoàn tiền." : "";
            showMsg(`Đã hủy đơn thành công.${refundNote}`, "success");
            fetchBookings();
        } catch (err) {
            showMsg(err?.response?.data?.message || err.message, "error");
        }
    };

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        setFilters({ ...filters, page: 1 });
        fetchBookings();
    };

    const formatMoney = (num) => num?.toLocaleString("vi-VN") + "đ";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-gray-800">Quản lý Booking</h1>
                <p className="text-gray-500 mt-1 text-sm">Xem, xác nhận và hủy đơn đặt sân</p>
            </div>

            {/* Toast */}
            {actionMsg.text && (
                <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold border ${
                    actionMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-600 border-red-200"
                }`}>
                    <span className="material-symbols-outlined text-[18px]">
                        {actionMsg.type === "success" ? "check_circle" : "error"}
                    </span>
                    {actionMsg.text}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <form onSubmit={handleFilterSubmit} className="flex flex-wrap gap-3 items-center">
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="PENDING">Chờ duyệt</option>
                        <option value="CONFIRMED">Đã xác nhận</option>
                        <option value="COMPLETED">Hoàn thành</option>
                        <option value="CANCELLED">Đã hủy</option>
                    </select>
                    <input
                        type="date" value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                    <span className="text-gray-400 text-sm">→</span>
                    <input
                        type="date" value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                    <button type="submit" className="px-5 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 font-semibold text-sm transition-all">
                        Lọc
                    </button>
                    {(filters.status || filters.startDate || filters.endDate) && (
                        <button
                            type="button"
                            onClick={() => setFilters({ page: 1, status: "", startDate: "", endDate: "" })}
                            className="px-4 py-2 text-gray-400 hover:text-gray-600 text-sm font-medium"
                        >
                            Xóa lọc
                        </button>
                    )}
                </form>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary" />
                        <p className="text-sm text-gray-400">Đang tải...</p>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <span className="material-symbols-outlined text-5xl text-gray-200 block mb-3">calendar_month</span>
                        <p className="font-semibold">Chưa có đơn đặt sân nào</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 whitespace-nowrap">Mã đơn</th>
                                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 whitespace-nowrap">Khách hàng</th>
                                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 whitespace-nowrap">Sân</th>
                                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 whitespace-nowrap">Ngày & Giờ</th>
                                    <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 whitespace-nowrap">Tổng tiền</th>
                                    <th className="text-center py-3 px-4 text-xs font-bold text-gray-500 whitespace-nowrap">Thanh toán</th>
                                    <th className="text-center py-3 px-4 text-xs font-bold text-gray-500 whitespace-nowrap">Trạng thái</th>
                                    <th className="text-center py-3 px-4 text-xs font-bold text-gray-500 whitespace-nowrap">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {bookings.map((b) => {
                                    const st = statusConfig[b.status] || { label: b.status, cls: "bg-gray-100 text-gray-600" };
                                    const pm = paymentConfig[b.paymentStatus] || { label: b.paymentStatus, cls: "bg-gray-100 text-gray-600" };
                                    return (
                                        <tr key={b._id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="py-3.5 px-4 font-mono text-xs font-bold text-gray-600 whitespace-nowrap">{b.bookingCode}</td>
                                            <td className="py-3.5 px-4">
                                                <p className="font-semibold text-gray-800 whitespace-nowrap">{b.userId?.fullName || "N/A"}</p>
                                                <p className="text-xs text-gray-400">{b.userId?.email}</p>
                                            </td>
                                            <td className="py-3.5 px-4 text-gray-600 font-medium">{b.courtId?.name || "N/A"}</td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <p className="font-semibold text-gray-700">{b.bookingDate}</p>
                                                <p className="text-xs text-gray-400">{b.startTime} – {b.endTime}</p>
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-black text-gray-800 whitespace-nowrap">{formatMoney(b.totalPrice)}</td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${pm.cls}`}>{pm.label}</span>
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${st.cls}`}>{st.label}</span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center justify-center gap-1 flex-nowrap">
                                                    {/* Duyệt */}
                                                    {b.status === "PENDING" && (
                                                        <button
                                                            onClick={() => handleConfirm(b._id)}
                                                            title="Duyệt đơn"
                                                            className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                                        </button>
                                                    )}
                                                    {/* Hoàn tất */}
                                                    {b.status === "CONFIRMED" && b.paymentStatus === "PAID" && (() => {
                                                        const nowVN = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
                                                        const bookingEndStr = `${b.bookingDate} ${b.endTime}:00`;
                                                        const canComplete = bookingEndStr <= nowVN;
                                                        return (
                                                            <button
                                                                onClick={() => canComplete && handleComplete(b._id)}
                                                                disabled={!canComplete}
                                                                title={canComplete ? "Hoàn tất đơn" : `Chờ hết giờ: ${b.endTime} ngày ${b.bookingDate}`}
                                                                className={`p-1.5 rounded-lg transition-colors ${canComplete ? "hover:bg-emerald-50 text-emerald-600 cursor-pointer" : "text-gray-300 cursor-not-allowed"}`}
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                                                            </button>
                                                        );
                                                    })()}
                                                    {/* Hủy */}
                                                    {!["CANCELLED", "COMPLETED"].includes(b.status) && (
                                                        <button
                                                            onClick={() => setCancelTarget(b)}
                                                            title="Hủy đơn"
                                                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">cancel</span>
                                                        </button>
                                                    )}
                                                    {/* Xem chi tiết đơn đặt sân */}
                                                    <button
                                                        onClick={() => setDetailTarget(b)}
                                                        title="Xem chi tiết đơn đặt sân"
                                                        className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary transition-colors text-xs font-semibold"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">info</span>
                                                        Chi tiết
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                        <span className="text-sm text-gray-500">
                            Trang {pagination.currentPage} / {pagination.totalPages} ({pagination.totalItems} đơn)
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={pagination.currentPage <= 1}
                                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ← Trước
                            </button>
                            <button
                                disabled={pagination.currentPage >= pagination.totalPages}
                                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sau →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Modals ─── */}
            {cancelTarget && (
                <CancelConfirmModal
                    booking={cancelTarget}
                    onConfirm={handleCancelConfirm}
                    onClose={() => setCancelTarget(null)}
                />
            )}
            {detailTarget && (
                <BookingDetailModal
                    booking={detailTarget}
                    onClose={() => setDetailTarget(null)}
                />
            )}
        </div>
    );
}
