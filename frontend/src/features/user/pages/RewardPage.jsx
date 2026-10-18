// src/features/user/pages/RewardPage.jsx
import { useState, useEffect } from "react";
import { commerceService } from "@/services/commerce.service";

// ─── Helpers ────────────────────────────────────────────────────────────────
const txTypeConfig = {
    EARN:   { label: "Cộng điểm",  icon: "add_circle",      cls: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    SPEND:  { label: "Dùng điểm",  icon: "remove_circle",   cls: "text-red-500 bg-red-50 border-red-200" },
    REFUND: { label: "Hoàn điểm",  icon: "restart_alt",     cls: "text-blue-600 bg-blue-50 border-blue-200" },
};

const discountTypeLabel = {
    PERCENT:      { label: "Giảm %",            icon: "percent" },
    FIXED:        { label: "Giảm tiền",          icon: "payments" },
};

function fmtMoney(n) {
    return (n ?? 0).toLocaleString("vi-VN") + "đ";
}

function fmtDate(d) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Coupon Check Result Card ─────────────────────────────────────────────────
function CouponResultCard({ coupon, orderValue }) {
    if (!coupon) return null;
    const typeInfo = discountTypeLabel[coupon.discountType] || discountTypeLabel.FIXED;
    const now = new Date();
    const isExpired = new Date(coupon.endDate) < now;
    const isNotStarted = new Date(coupon.startDate) > now;
    const isActive = coupon.status === "ACTIVE" && !isExpired && !isNotStarted;

    let discountText = "";
    if (coupon.discountType === "PERCENT") {
        discountText = `Giảm ${coupon.discountValue}%`;
        if (coupon.maxDiscountValue) discountText += ` (tối đa ${fmtMoney(coupon.maxDiscountValue)})`;
    } else if (coupon.discountType === "FIXED") {
        discountText = `Giảm ${fmtMoney(coupon.discountValue)}`;
    } else {
        discountText = "Miễn phí vận chuyển";
    }

    return (
        <div className={`rounded-2xl border p-5 transition-all ${isActive ? "border-emerald-200 bg-emerald-50/40" : "border-gray-200 bg-gray-50"}`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isActive ? "bg-emerald-100" : "bg-gray-100"}`}>
                        <span className={`material-symbols-outlined text-[24px] ${isActive ? "text-emerald-600" : "text-gray-400"}`}>
                            confirmation_number
                        </span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`font-mono font-black text-xl tracking-widest ${isActive ? "text-primary" : "text-gray-400"}`}>
                                {coupon.code}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                isActive ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                    : isExpired ? "bg-red-100 text-red-600 border-red-200"
                                        : "bg-gray-100 text-gray-500 border-gray-200"
                            }`}>
                                {isExpired ? "Hết hạn" : isNotStarted ? "Chưa bắt đầu" : coupon.status === "ACTIVE" ? "Hoạt động" : "Tạm dừng"}
                            </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-700 mt-0.5">{coupon.name}</p>
                    </div>
                </div>
            </div>

            {/* Discount value */}
            <div className={`p-3 rounded-xl mb-3 ${isActive ? "bg-primary/5 border border-primary/10" : "bg-gray-100"}`}>
                <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[18px] ${isActive ? "text-primary" : "text-gray-400"}`}>
                        {typeInfo.icon}
                    </span>
                    <p className={`text-lg font-black ${isActive ? "text-primary" : "text-gray-400"}`}>{discountText}</p>
                </div>
                {coupon.description && (
                    <p className="text-xs text-gray-500 mt-1">{coupon.description}</p>
                )}
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white rounded-xl p-2.5 border border-gray-100">
                    <p className="text-gray-400 mb-0.5">Đơn tối thiểu</p>
                    <p className="font-bold text-gray-700">{fmtMoney(coupon.minOrderValue)}</p>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-gray-100">
                    <p className="text-gray-400 mb-0.5">Lượt đã dùng</p>
                    <p className="font-bold text-gray-700">{coupon.usedCount} / {coupon.usageLimit ?? "∞"}</p>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-gray-100">
                    <p className="text-gray-400 mb-0.5">Bắt đầu</p>
                    <p className="font-bold text-gray-700">{new Date(coupon.startDate).toLocaleDateString("vi-VN")}</p>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-gray-100">
                    <p className="text-gray-400 mb-0.5">Hết hạn</p>
                    <p className={`font-bold ${isExpired ? "text-red-500" : "text-gray-700"}`}>
                        {new Date(coupon.endDate).toLocaleDateString("vi-VN")}
                    </p>
                </div>
            </div>

            {/* Status note */}
            {!isActive && (
                <div className="mt-3 flex items-center gap-2 p-2.5 bg-red-50 rounded-xl border border-red-100">
                    <span className="material-symbols-outlined text-red-400 text-[16px]">info</span>
                    <p className="text-xs text-red-600 font-medium">
                        {isExpired ? "Mã này đã hết hạn sử dụng." : isNotStarted ? "Mã chưa đến thời gian sử dụng." : "Mã đang tạm dừng hoạt động."}
                    </p>
                </div>
            )}
            {isActive && (
                <div className="mt-3 flex items-center gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="material-symbols-outlined text-emerald-500 text-[16px]">check_circle</span>
                    <p className="text-xs text-emerald-700 font-medium">Mã hợp lệ — có thể sử dụng khi đặt sân!</p>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RewardPage() {
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loadingWallet, setLoadingWallet] = useState(true);

    // Coupon check
    const [couponCode, setCouponCode] = useState("");
    const [checkingCoupon, setCheckingCoupon] = useState(false);
    const [couponResult, setCouponResult] = useState(null);  // { coupon } | null
    const [couponError, setCouponError] = useState("");

    // Fetch wallet + transactions
    useEffect(() => {
        commerceService.getPointWallet()
            .then(res => {
                if (res?.success) {
                    setWallet(res.wallet);
                    setTransactions(res.transactions || []);
                }
            })
            .catch(err => console.error("Wallet error:", err))
            .finally(() => setLoadingWallet(false));
    }, []);

    const handleCheckCoupon = async (e) => {
        e.preventDefault();
        if (!couponCode.trim()) return;
        setCheckingCoupon(true);
        setCouponResult(null);
        setCouponError("");
        try {
            // Dùng orderValue lớn để bypass điều kiện đơn tối thiểu — chỉ muốn xem coupon có tồn tại không
            const res = await commerceService.validateCoupon({
                code: couponCode.trim().toUpperCase(),
                orderValue: 999999999
            });
            if (res?.coupon) {
                setCouponResult({ coupon: res.coupon });
            } else {
                setCouponError("Mã giảm giá không tồn tại hoặc không hợp lệ.");
            }
        } catch (err) {
            const msg = err?.response?.data?.message || "";
            if (msg.includes("không tồn tại") || msg.includes("không hợp lệ") || msg.includes("tìm thấy")) {
                setCouponError("Mã giảm giá không tồn tại hoặc không hợp lệ.");
            } else if (msg.includes("hết hạn")) {
                setCouponError(msg);
            } else if (msg.includes("tạm dừng") || msg.includes("kích hoạt")) {
                setCouponError(msg);
            } else if (msg.includes("lượt sử dụng")) {
                setCouponError(msg);
            } else {
                setCouponError(msg || "Không thể kiểm tra mã. Vui lòng thử lại!");
            }
        } finally {
            setCheckingCoupon(false);
        }
    };

    const POINT_TO_VND = 1000;
    const balance = wallet?.balance ?? 0;
    const totalEarned = wallet?.lifetimeEarned ?? 0;
    const totalSpent = wallet?.lifetimeSpent ?? 0;

    return (
        <div className="min-h-screen bg-background pt-10 pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

                {/* ─── Page Header ─── */}
                <div>
                    <h1 className="section-heading">Điểm & Ưu đãi</h1>
                    <p className="muted-copy mt-1">Quản lý điểm tích lũy và kiểm tra mã giảm giá của bạn</p>
                </div>

                {/* ─── Wallet Hero ─── */}
                {loadingWallet ? (
                    <div className="h-40 bg-surface-container rounded-2xl animate-pulse" />
                ) : (
                    <div className="relative bg-ink rounded-2xl overflow-hidden shadow-soft p-8">
                        <div className="relative z-10">
                            <div className="flex items-start justify-between flex-wrap gap-4">
                                <div>
                                    <p className="text-emerald-200/70 text-sm font-medium mb-1">Ví điểm tích lũy</p>
                                    <div className="flex items-end gap-3">
                                        <span className="text-5xl font-black text-white">{balance.toLocaleString()}</span>
                                        <span className="text-emerald-300 font-semibold mb-2">điểm</span>
                                    </div>
                                    <p className="text-emerald-200/60 text-sm mt-1">
                                        ≈ <span className="font-bold text-emerald-200">{fmtMoney(balance * POINT_TO_VND)}</span> khi dùng đặt sân
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-2">
                                        <span className="material-symbols-outlined text-white text-[32px]">workspace_premium</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-white/10">
                                <div>
                                    <p className="text-emerald-200/60 text-xs">Tổng điểm đã nhận</p>
                                    <p className="text-white font-bold text-lg">{totalEarned.toLocaleString()} điểm</p>
                                </div>
                                <div>
                                    <p className="text-emerald-200/60 text-xs">Tổng điểm đã dùng</p>
                                    <p className="text-white font-bold text-lg">{totalSpent.toLocaleString()} điểm</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Coupon Check ─── */}
                <div className="surface-panel overflow-hidden">
                    <div className="px-7 py-5 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-[20px]">confirmation_number</span>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-800">Kiểm tra mã giảm giá</h2>
                                <p className="text-xs text-gray-400">Nhập mã để xem thông tin chi tiết và điều kiện sử dụng</p>
                            </div>
                        </div>
                    </div>

                    <div className="px-7 py-6 space-y-4">
                        <form onSubmit={handleCheckCoupon} className="flex gap-3">
                            <div className="relative flex-1">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2">
                                    <span className="material-symbols-outlined text-gray-400 text-[20px]">tag</span>
                                </span>
                                <input
                                    value={couponCode}
                                    onChange={e => {
                                        setCouponCode(e.target.value.toUpperCase());
                                        setCouponResult(null);
                                        setCouponError("");
                                    }}
                                    placeholder="Nhập mã coupon... VD: SUMMER30"
                                    className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl text-sm font-mono font-bold tracking-wide focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={checkingCoupon || !couponCode.trim()}
                                className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/20"
                            >
                                {checkingCoupon ? (
                                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <span className="material-symbols-outlined text-[18px]">search</span>
                                )}
                                Kiểm tra
                            </button>
                        </form>

                        {/* Error msg */}
                        {couponError && !couponResult && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
                                <span className="material-symbols-outlined text-red-400 text-[18px] flex-shrink-0">error</span>
                                <p className="text-sm text-red-600 font-medium">{couponError}</p>
                            </div>
                        )}

                        {/* Coupon result */}
                        {couponResult && (
                            <div className="animate-fadeIn">
                                <CouponResultCard coupon={couponResult.coupon} />
                                {couponError && (
                                    <div className="mt-2 flex items-center gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                                        <span className="material-symbols-outlined text-amber-400 text-[16px]">warning</span>
                                        <p className="text-xs text-amber-700 font-medium">{couponError}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Transaction History ─── */}
                <div className="surface-panel overflow-hidden">
                    <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600 text-[20px]">receipt_long</span>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-800">Lịch sử điểm</h2>
                                <p className="text-xs text-gray-400">20 giao dịch gần nhất</p>
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                            {transactions.length} giao dịch
                        </span>
                    </div>

                    {loadingWallet ? (
                        <div className="py-12 text-center">
                            <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="py-16 text-center">
                            <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                <span className="material-symbols-outlined text-gray-300 text-4xl">receipt_long</span>
                            </div>
                            <p className="text-gray-500 font-semibold">Chưa có giao dịch nào</p>
                            <p className="text-sm text-gray-400 mt-1">Hãy đánh giá sân hoặc đặt sân để tích điểm!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {transactions.map((tx, i) => {
                                const cfg = txTypeConfig[tx.type] || txTypeConfig.EARN;
                                const isPositive = tx.type !== "SPEND";
                                return (
                                    <div key={tx._id || i} className="flex items-center gap-4 px-7 py-4 hover:bg-gray-50/60 transition-colors">
                                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${cfg.cls}`}>
                                            <span className="material-symbols-outlined text-[20px]">{cfg.icon}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{tx.description || cfg.label}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{fmtDate(tx.createdAt)}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className={`text-base font-black ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                                                {isPositive ? "+" : ""}{tx.points?.toLocaleString()} điểm
                                            </p>
                                            <p className="text-[11px] text-gray-400">
                                                {isPositive ? "+" : "-"}{fmtMoney(Math.abs(tx.moneyValue ?? 0))}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ─── How to earn points ─── */}
                <div className="surface-panel p-7">
                    <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500 text-[20px]">star</span>
                        Cách tích điểm
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { icon: "rate_review", title: "Đánh giá sân", pts: "+20 điểm", desc: "Mỗi lần đánh giá sau khi hoàn thành lượt chơi" },
                            { icon: "sports_tennis", title: "Đặt sân & chơi", desc: "Dùng điểm để thanh toán khi đặt sân (1 điểm = 1.000đ)", pts: "Quy đổi" },
                            { icon: "card_giftcard", title: "Ưu đãi sắp tới", desc: "Nhiều chương trình tích điểm đang được triển khai", pts: "Sắp có" },
                        ].map(item => (
                            <div key={item.title} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                                    <span className="material-symbols-outlined text-primary text-[20px]">{item.icon}</span>
                                </div>
                                <p className="font-bold text-gray-800 text-sm">{item.title}</p>
                                <p className="text-xs text-primary font-bold mt-1">{item.pts}</p>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
