// src/features/user/pages/UserProfile.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { userService } from "@/services/user.service";
import { reviewService } from "@/services/review.service";

// ─── Màu sắc trạng thái đơn đặt sân ──────────────────────────────────────────
const statusConfig = {
    PENDING: { label: "Chờ duyệt", cls: "bg-amber-100 text-amber-700 border border-amber-200" },
    CONFIRMED: { label: "Đã xác nhận", cls: "bg-blue-100 text-blue-700 border border-blue-200" },
    COMPLETED: { label: "Hoàn thành", cls: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
    CANCELLED: { label: "Đã hủy", cls: "bg-red-100 text-red-700 border border-red-200" },
};

const paymentConfig = {
    UNPAID: { label: "Chưa thanh toán", cls: "bg-orange-100 text-orange-700" },
    PAID: { label: "Đã thanh toán", cls: "bg-green-100 text-green-700" },
    REFUNDED: { label: "Đã hoàn tiền", cls: "bg-purple-100 text-purple-700" },
};

// ─── Star Rating Component ─────────────────────────────────────────────────────
function StarRating({ value, onChange, size = 32, readonly = false }) {
    const [hovered, setHovered] = useState(0);
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={readonly}
                    onClick={() => !readonly && onChange?.(star)}
                    onMouseEnter={() => !readonly && setHovered(star)}
                    onMouseLeave={() => !readonly && setHovered(0)}
                    className={`transition-transform ${!readonly ? "hover:scale-110 cursor-pointer" : "cursor-default"}`}
                    style={{ fontSize: size }}
                >
                    <span
                        className="material-symbols-outlined select-none"
                        style={{
                            fontSize: size,
                            color: star <= (hovered || value) ? "#f59e0b" : "#d1d5db",
                            transition: "color 0.15s",
                            fontVariationSettings: "'FILL' 1",
                        }}
                    >
                        star
                    </span>
                </button>
            ))}
        </div>
    );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({ booking, onClose, onSuccess }) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [images, setImages] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files || []);
        const combined = [...images, ...files].slice(0, 5);
        setImages(combined);
        setPreviews(combined.map(f => URL.createObjectURL(f)));
        e.target.value = "";
    };

    const handleRemoveImage = (idx) => {
        const next = images.filter((_, i) => i !== idx);
        setImages(next);
        setPreviews(next.map(f => URL.createObjectURL(f)));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rating) return setError("Vui lòng chọn số sao đánh giá!");
        setSubmitting(true);
        setError("");
        try {
            let payload;
            if (images.length > 0) {
                const fd = new FormData();
                fd.append("courtId", booking.courtId?._id || booking.courtId);
                fd.append("bookingId", booking._id);
                fd.append("rating", rating);
                fd.append("comment", comment);
                images.forEach(img => fd.append("images", img));
                payload = fd;
            } else {
                payload = {
                    courtId: booking.courtId?._id || booking.courtId,
                    bookingId: booking._id,
                    rating,
                    comment,
                };
            }
            await reviewService.createReview(payload);
            onSuccess();
        } catch (err) {
            setError(err?.response?.data?.message || "Gửi đánh giá thất bại. Vui lòng thử lại!");
        } finally {
            setSubmitting(false);
        }
    };

    const ratingLabels = ["", "Tệ", "Không tốt", "Bình thường", "Tốt", "Xuất sắc"];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-2xl shadow-soft w-full max-w-md overflow-hidden animate-fadeIn">
                {/* Header */}
                <div className="bg-ink px-6 py-5 relative">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-white/70 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined text-[22px]">close</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[22px]">rate_review</span>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Đánh giá sân</h3>
                            <p className="text-white/65 text-xs mt-0.5">{booking.courtId?.name || "Sân Pickleball"}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                    {/* Booking info */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="material-symbols-outlined text-primary text-[20px]">calendar_month</span>
                        <div>
                            <p className="text-xs font-semibold text-gray-700">
                                {booking.bookingDate} · {booking.startTime} – {booking.endTime}
                            </p>
                            <p className="text-[11px] text-gray-400 font-mono mt-0.5">#{booking.bookingCode}</p>
                        </div>
                    </div>

                    {/* Star rating */}
                    <div className="text-center space-y-3">
                        <p className="text-sm font-semibold text-gray-700">Bạn đánh giá thế nào?</p>
                        <div className="flex justify-center">
                            <StarRating value={rating} onChange={setRating} size={40} />
                        </div>
                        {rating > 0 && (
                            <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                                {ratingLabels[rating]}
                            </span>
                        )}
                    </div>

                    {/* Comment */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">
                            Nhận xét <span className="text-gray-400 font-normal">(tùy chọn)</span>
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Chia sẻ trải nghiệm của bạn về sân này..."
                            maxLength={1500}
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                        />
                        <p className="text-[11px] text-gray-400 text-right">{comment.length}/1500</p>
                    </div>

                    {/* Image upload */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">
                            Ảnh thực tế{" "}
                            <span className="text-gray-400 font-normal">(tùy chọn, tối đa 5 ảnh)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer w-max px-4 py-2 border border-dashed border-gray-300 rounded-xl hover:border-primary hover:bg-primary/5 transition-colors text-sm text-gray-500 hover:text-primary">
                            <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                            Chọn ảnh
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleImageChange}
                                disabled={images.length >= 5}
                            />
                        </label>
                        {previews.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                                {previews.map((src, idx) => (
                                    <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 group">
                                        <img src={src} alt="" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(idx)}
                                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <span className="material-symbols-outlined text-white text-[18px]">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Points reward notice */}
                    <div className="flex items-center gap-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="material-symbols-outlined text-primary text-[22px]">redeem</span>
                        <p className="text-xs text-emerald-700 font-medium">
                            Bạn sẽ nhận <span className="font-bold">20 điểm thưởng</span> sau khi gửi đánh giá!
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl border border-red-200">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 text-sm transition-all"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !rating}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-primary/20"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Đang gửi...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                    Gửi đánh giá
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Review Done Badge ────────────────────────────────────────────────────────
function ReviewedBadge({ review }) {
    return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg">
            <StarRating value={review.rating} size={14} readonly />
            <span className="text-[11px] font-semibold text-amber-700">Đã đánh giá</span>
        </div>
    );
}

// ─── Repay Modal ──────────────────────────────────────────────────────────────
function RepayModal({ booking, onClose, onSuccess }) {
    const [paymentData, setPaymentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        userService.getPaymentIntent(booking._id)
            .then(res => {
                if (res.success) {
                    setPaymentData({
                        qrCodeUrl: res.qrCodeUrl,
                        paymentDescription: res.paymentDescription,
                        totalPrice: booking.totalPrice,
                        bookingCode: booking.bookingCode,
                    });
                } else {
                    setPaymentData({
                        qrCodeUrl: `https://img.vietqr.io/image/MB-0900000002-qr_only.png?amount=${booking.totalPrice}&addInfo=CHUYEN%20TIEN%20SAN%20${booking.bookingCode}`,
                        paymentDescription: `CHUYEN TIEN SAN ${booking.bookingCode}`,
                        totalPrice: booking.totalPrice,
                        bookingCode: booking.bookingCode,
                    });
                }
            })
            .catch(() => {
                setPaymentData({
                    qrCodeUrl: `https://img.vietqr.io/image/MB-0900000002-qr_only.png?amount=${booking.totalPrice}&addInfo=CHUYEN%20TIEN%20SAN%20${booking.bookingCode}`,
                    paymentDescription: `CHUYEN TIEN SAN ${booking.bookingCode}`,
                    totalPrice: booking.totalPrice,
                    bookingCode: booking.bookingCode,
                });
            })
            .finally(() => setLoading(false));
    }, [booking._id]);

    const handleVerify = async () => {
        setVerifying(true);
        setError("");
        try {
            const res = await userService.confirmPayment(booking._id, "BANKING");
            if (res.success) {
                setVerified(true);
                setTimeout(() => onSuccess(), 1500);
            }
        } catch (err) {
            setError(err?.response?.data?.message || "Xác minh thất bại, vui lòng thử lại!");
        } finally {
            setVerifying(false);
        }
    };

    const formatMoney = (n) => n?.toLocaleString("vi-VN") + "đ";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-2xl shadow-soft w-full max-w-sm overflow-hidden animate-fadeIn">
                {/* Header */}
                <div className="bg-ink px-6 py-4 relative">
                    <button onClick={onClose} className="absolute right-4 top-4 text-white/70 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[22px]">close</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[20px]">qr_code_2</span>
                        </div>
                        <div>
                            <h3 className="text-white font-bold">Thanh toán đơn đặt sân</h3>
                            <p className="text-white/65 text-xs mt-0.5">#{booking.bookingCode}</p>
                        </div>
                    </div>
                </div>

                <div className="p-5 space-y-4 text-center">
                    {loading ? (
                        <div className="py-8 flex flex-col items-center gap-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
                            <p className="text-sm text-gray-400">Đang tải thông tin thanh toán...</p>
                        </div>
                    ) : verified ? (
                        <div className="py-6 space-y-3">
                            <div className="w-12 h-12 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-emerald-600 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            </div>
                            <p className="font-bold text-gray-800">Xác nhận thanh toán thành công!</p>
                            <p className="text-xs text-gray-500">Đơn đặt sân đã được xác nhận thanh toán.</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Quét mã QR bằng ứng dụng ngân hàng để chuyển khoản thanh toán:
                            </p>
                            <div className="w-44 h-44 mx-auto border-2 border-emerald-100 rounded-2xl overflow-hidden p-1 shadow-inner bg-emerald-50">
                                <img src={paymentData.qrCodeUrl} alt="VietQR" className="w-full h-full object-contain" />
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl text-xs font-semibold text-gray-600 space-y-1.5 border border-gray-100 text-left">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Ngân hàng:</span>
                                    <span>MB Bank (Quân Đội)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Số tài khoản:</span>
                                    <span className="text-primary font-bold">0900000002</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Số tiền:</span>
                                    <span className="text-red-500 font-bold">{formatMoney(paymentData.totalPrice)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Nội dung CK:</span>
                                    <span className="text-primary font-bold select-all">{paymentData.paymentDescription}</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400">Lưu ý: Nội dung chuyển khoản phải ghi chính xác để hệ thống tự động duyệt.</p>
                            {error && (
                                <p className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-2 rounded-xl border border-red-200">{error}</p>
                            )}
                            <div className="flex gap-3">
                                <button type="button" onClick={onClose}
                                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-50 transition-all">
                                    Đóng
                                </button>
                                <button type="button" onClick={handleVerify} disabled={verifying}
                                    className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-primary/20">
                                    {verifying ? "Đang xác minh..." : (
                                        <><span className="material-symbols-outlined text-[15px] animate-spin">autorenew</span>Xác minh thanh toán</>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Booking Detail Modal ──────────────────────────────────────────────────────
function BookingDetailModal({ booking, onClose }) {
    const status = statusConfig[booking.status] || { label: booking.status, cls: "bg-gray-100 text-gray-600" };
    const payment = paymentConfig[booking.paymentStatus] || { label: booking.paymentStatus, cls: "bg-gray-100 text-gray-600" };
    const formatMoney = (n) => n?.toLocaleString("vi-VN") + "đ";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-2xl shadow-soft w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn flex flex-col">
                {/* Header */}
                <div className="bg-ink px-6 py-5 relative flex-shrink-0 text-white">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-white/70 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined text-[22px]">close</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[22px]">receipt_long</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white">Chi tiết đơn đặt sân</h3>
                            <p className="text-white/65 text-xs mt-0.5">Mã đơn: #{booking.bookingCode}</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-6 overflow-y-auto custom-scrollbar text-left">
                    {/* Court Info */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Thông tin sân chơi</h4>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2.5">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">sports_tennis</span>
                                <div>
                                    <p className="font-bold text-gray-800 text-sm">{booking.courtId?.name || "Sân Pickleball"}</p>
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
                                    <span>Ngày đặt: <span className="font-semibold text-gray-800">{booking.bookingDate}</span></span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-gray-400">schedule</span>
                                    <span>Khung giờ: <span className="font-semibold text-primary">{booking.startTime} – {booking.endTime}</span> ({booking.durationHours} giờ)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status & Payment */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Trạng thái đặt</h4>
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

                    {/* Equipments */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Thiết bị thuê kèm</h4>
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
                                                "bg-amber-100 text-amber-700 border border-amber-200 animate-pulse"
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

                    {/* Financial details */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Chi tiết chi phí</h4>
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

// ─── Sub-component: Booking Card ──────────────────────────────────────────────
function BookingCard({ booking, onCancel, onReview, onRepay, onViewDetail }) {
    const status = statusConfig[booking.status] || { label: booking.status, cls: "bg-gray-100 text-gray-600" };
    const payment = paymentConfig[booking.paymentStatus] || { label: booking.paymentStatus, cls: "bg-gray-100 text-gray-600" };
    const canCancel = !["CANCELLED", "COMPLETED"].includes(booking.status);
    const canReview = booking.status === "COMPLETED" && booking.paymentStatus === "PAID";
    const canRepay = booking.paymentStatus === "UNPAID" && booking.status !== "CANCELLED";
    const formatMoney = (n) => n?.toLocaleString("vi-VN") + "đ";

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group text-left">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-surface-container-low border-b border-gray-100">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">
                        #{booking.bookingCode}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${status.cls}`}>
                        {status.label}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${payment.cls}`}>
                        {payment.label}
                    </span>
                    {/* Đã đánh giá badge */}
                    {booking._review && <ReviewedBadge review={booking._review} />}
                </div>
                <div className="flex items-center gap-2">
                    {/* Chi tiết button */}
                    <button
                        onClick={() => onViewDetail(booking)}
                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-primary font-semibold px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[15px]">info</span>
                        Chi tiết
                    </button>
                    {/* Nút đánh giá */}
                    {canRepay && (
                        <button
                            onClick={() => onRepay(booking)}
                            className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all"
                        >
                            <span className="material-symbols-outlined text-[15px]">payments</span>
                            Thanh toán ngay
                        </button>
                    )}
                    {canReview && !booking._review && (
                        <button
                            onClick={() => onReview(booking)}
                            className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-semibold px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all"
                        >
                            <span className="material-symbols-outlined text-[15px]">star</span>
                            Đánh giá
                        </button>
                    )}
                    {canCancel && (
                        <button
                            onClick={() => onCancel(booking._id)}
                            className="text-xs text-red-400 hover:text-red-600 font-semibold opacity-0 group-hover:opacity-100 transition-all px-2 py-1 rounded-lg hover:bg-red-50"
                        >
                            Hủy đơn
                        </button>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-primary text-[20px]">sports_tennis</span>
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 text-sm">{booking.courtId?.name || "Sân Pickleball"}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            <span className="font-medium text-gray-700">{booking.bookingDate}</span>
                            {" · "}
                            <span>{booking.startTime} – {booking.endTime}</span>
                        </p>
                        {booking.equipmentItems?.length > 0 && (
                            <p className="text-xs text-primary/70 mt-1">
                                +{booking.equipmentItems.length} thiết bị thuê kèm
                            </p>
                        )}
                        {/* Review comment preview */}
                        {booking._review?.comment && (
                            <p className="text-xs text-gray-400 italic mt-1 line-clamp-1">
                                "{booking._review.comment}"
                            </p>
                        )}
                        {/* Lý do hủy */}
                        {booking.status === "CANCELLED" && booking.cancelReason && (
                            <p className="text-xs text-red-400 mt-1 line-clamp-1">
                                {booking.cancelReason}
                            </p>
                        )}
                    </div>
                </div>
                <div className="text-right sm:flex-shrink-0">
                    <p className="text-lg font-black text-primary">{formatMoney(booking.totalPrice)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Tổng chi phí</p>
                </div>
            </div>

            {/* Banner hoàn tiền */}
            {booking.status === "CANCELLED" && booking.paymentStatus === "REFUNDED" && (
                <div className="mx-5 mb-4 flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="material-symbols-outlined text-amber-500 text-[18px] flex-shrink-0 mt-0.5">account_balance_wallet</span>
                    <div>
                        <p className="text-xs font-bold text-amber-700">Hoàn tiền đang được xử lý</p>
                        <p className="text-xs text-amber-600 mt-0.5">
                            Số tiền <span className="font-black">{formatMoney(booking.totalPrice)}</span> sẽ được hoàn lại trong vòng <span className="font-bold">24 giờ làm việc</span> qua phương thức thanh toán ban đầu.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function UserProfile() {
    const navigate = useNavigate();
    const { user: storeUser, accessToken, setAuth, clearAuth } = useAuthStore();

    const [activeTab, setActiveTab] = useState("profile");
    const [profileData, setProfileData] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [loadingBookings, setLoadingBookings] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    // Review modal state
    const [reviewTarget, setReviewTarget] = useState(null); // booking đang muốn review
    const [reviewSuccess, setReviewSuccess] = useState(false);
    const [detailTarget, setDetailTarget] = useState(null);
    const [payingBooking, setPayingBooking] = useState(null);

    // Edit form state
    const [editForm, setEditForm] = useState({ fullName: "", phone: "" });
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const fileInputRef = useRef(null);

    // ── Fetch profile ──
    useEffect(() => {
        userService.getMyProfile()
            .then(res => {
                if (res?.success && res.user) {
                    setProfileData(res.user);
                    setEditForm({ fullName: res.user.fullName || "", phone: res.user.phone || "" });
                }
            })
            .catch(err => {
                console.error("Profile error:", err);
                if (storeUser) {
                    setProfileData(storeUser);
                    setEditForm({ fullName: storeUser.fullName || "", phone: storeUser.phone || "" });
                }
            })
            .finally(() => setLoadingProfile(false));
    }, []);

    // ── Fetch bookings + review status ──
    const fetchBookings = useCallback(async () => {
        setLoadingBookings(true);
        try {
            const res = await userService.getMyBookings();
            if (!res?.success) return;
            const rawBookings = res.bookings || [];

            // Fetch review cho các booking COMPLETED + PAID song song
            const completedPaid = rawBookings.filter(
                b => b.status === "COMPLETED" && b.paymentStatus === "PAID"
            );
            const reviewResults = await Promise.allSettled(
                completedPaid.map(b => reviewService.getMyBookingReview(b._id))
            );

            const reviewMap = {};
            completedPaid.forEach((b, i) => {
                const r = reviewResults[i];
                if (r.status === "fulfilled" && r.value?.review) {
                    reviewMap[b._id] = r.value.review;
                }
            });

            // Gắn _review vào booking
            const enriched = rawBookings.map(b => ({
                ...b,
                _review: reviewMap[b._id] || null,
            }));
            setBookings(enriched);
        } catch (err) {
            console.error("Bookings error:", err);
        } finally {
            setLoadingBookings(false);
        }
    }, []);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    // ── Handlers ──
    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSuccessMsg("");
        setErrorMsg("");
        try {
            const form = new FormData();
            form.append("fullName", editForm.fullName);
            form.append("phone", editForm.phone);
            if (avatarFile) form.append("avatar", avatarFile);

            const res = await userService.updateMyProfile(form);
            if (res?.success && res.user) {
                setProfileData(res.user);
                setAuth(res.user, accessToken);
                setSuccessMsg("Cập nhật hồ sơ thành công!");
                setAvatarFile(null);
                setAvatarPreview(null);
            }
        } catch (err) {
            setErrorMsg(err?.response?.data?.message || "Cập nhật thất bại. Vui lòng thử lại!");
        } finally {
            setSaving(false);
        }
    };

    const handleCancelBooking = async (bookingId) => {
        const reason = window.prompt("Lý do hủy đơn (tùy chọn):");
        if (reason === null) return;
        try {
            await userService.cancelMyBooking(bookingId, reason || "Khách hàng tự hủy");
            setBookings(prev => prev.map(b =>
                b._id === bookingId ? { ...b, status: "CANCELLED" } : b
            ));
        } catch (err) {
            alert(err?.response?.data?.message || "Không thể hủy đơn này!");
        }
    };

    const handleReviewSuccess = () => {
        setReviewTarget(null);
        setReviewSuccess(true);
        // Reload bookings để cập nhật trạng thái đánh giá
        fetchBookings();
        setTimeout(() => setReviewSuccess(false), 4000);
    };

    const handleLogout = () => {
        clearAuth();
        localStorage.removeItem("refreshToken");
        navigate("/login");
    };

    const displayUser = profileData || storeUser;
    const avatarSrc = avatarPreview || displayUser?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${displayUser?.fullName || "user"}`;

    // ── Booking stats ──
    const bookingStats = {
        total: bookings.length,
        completed: bookings.filter(b => b.status === "COMPLETED").length,
        pending: bookings.filter(b => b.status === "PENDING").length,
        cancelled: bookings.filter(b => b.status === "CANCELLED").length,
    };
    const completionRate = bookingStats.total > 0 ? Math.round((bookingStats.completed / bookingStats.total) * 100) : 0;
    const lastBooking = bookings[0];

    return (
        <div className="min-h-screen bg-background pb-16 pt-8">
            <div className="app-shell max-w-6xl">
                <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="stat-pill mb-3 w-fit">
                            <span className="material-symbols-outlined text-[15px]">manage_accounts</span>
                            Tài khoản người chơi
                        </p>
                        <h1 className="section-heading">Hồ sơ cá nhân</h1>
                        <p className="muted-copy mt-2">Quản lý thông tin tài khoản, ảnh đại diện và lịch sử đặt sân.</p>
                    </div>
                    <button onClick={() => navigate("/courts")} className="btn-primary w-full md:w-auto">
                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        Đặt sân mới
                    </button>
                </div>

                <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
                    <aside className="space-y-4">
                        <div className="surface-panel overflow-hidden">
                            <div className="bg-ink px-6 py-6 text-white">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="relative group">
                                        <div className="h-24 w-24 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                                            <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute inset-0 grid place-items-center rounded-2xl bg-black/45 opacity-0 transition-opacity group-hover:opacity-100"
                                            title="Đổi ảnh đại diện"
                                        >
                                            <span className="material-symbols-outlined text-white text-[22px]">photo_camera</span>
                                        </button>
                                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-white/75 transition-all hover:bg-white/15 hover:text-white"
                                        title="Đăng xuất"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">logout</span>
                                    </button>
                                </div>

                                <div className="mt-5">
                                    {loadingProfile ? (
                                        <div className="animate-pulse space-y-2">
                                            <div className="h-7 w-44 rounded bg-white/20" />
                                            <div className="h-4 w-36 rounded bg-white/10" />
                                        </div>
                                    ) : (
                                        <>
                                            <h2 className="text-2xl font-black tracking-tight">{displayUser?.fullName || "Người dùng"}</h2>
                                            <p className="mt-1 text-sm text-white/65">{displayUser?.email}</p>
                                        </>
                                    )}
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                                            {displayUser?.role === "ADMIN" ? "Admin" : "Người chơi"}
                                        </span>
                                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${
                                            displayUser?.status === "ACTIVE"
                                                ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-200"
                                                : "border-red-400/30 bg-red-400/15 text-red-200"
                                        }`}>
                                            {displayUser?.status === "ACTIVE" ? "Đang hoạt động" : "Đã khóa"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-px bg-outline-variant/60">
                                {[
                                    { label: "Tổng đơn", value: bookingStats.total },
                                    { label: "Hoàn thành", value: bookingStats.completed },
                                    { label: "Chờ duyệt", value: bookingStats.pending },
                                    { label: "Tỉ lệ hoàn tất", value: `${completionRate}%` },
                                ].map(stat => (
                                    <div key={stat.label} className="bg-white p-4">
                                        <p className="text-2xl font-black text-on-surface">{loadingBookings ? "-" : stat.value}</p>
                                        <p className="mt-1 text-xs font-bold text-on-surface-variant">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="surface-panel p-5">
                            <div className="flex items-center gap-3">
                                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-container text-primary">
                                    <span className="material-symbols-outlined text-[20px]">event_available</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-on-surface">Lượt đặt gần nhất</h3>
                                    <p className="text-xs text-on-surface-variant">
                                        {lastBooking ? `${lastBooking.bookingDate} · ${lastBooking.startTime} - ${lastBooking.endTime}` : "Chưa có lượt đặt sân"}
                                    </p>
                                </div>
                            </div>
                            {lastBooking && (
                                <div className="mt-4 rounded-xl border border-outline-variant/70 bg-surface-container-low p-3">
                                    <p className="text-sm font-bold text-on-surface">{lastBooking.courtId?.name || "Sân Pickleball"}</p>
                                    <p className="mt-1 text-xs text-on-surface-variant">Mã đơn #{lastBooking.bookingCode}</p>
                                </div>
                            )}
                        </div>
                    </aside>

                    <section className="min-w-0">
                        <div className="mb-5 flex w-full gap-1 rounded-2xl border border-outline-variant/70 bg-surface-container-low p-1 sm:w-fit">
                            {[
                                { id: "profile", label: "Thông tin", icon: "person" },
                                { id: "bookings", label: "Lịch sử đặt sân", icon: "history" },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 sm:flex-none ${
                                        activeTab === tab.id
                                            ? "bg-white text-primary shadow-sm"
                                            : "text-on-surface-variant hover:text-on-surface"
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                {/* ─── Tab: Hồ sơ ────────────────────────────────────── */}
                {activeTab === "profile" && (
                    <div className="surface-panel overflow-hidden">
                        <div className="border-b border-gray-100 px-6 py-5 md:px-8">
                            <h2 className="text-lg font-black text-gray-900">Thông tin cá nhân</h2>
                            <p className="mt-1 text-sm text-gray-500">Cập nhật tên hiển thị, số điện thoại và ảnh đại diện.</p>
                        </div>

                        <form onSubmit={handleSaveProfile} className="space-y-5 px-6 py-6 md:px-8">
                            {/* Avatar preview khi đổi */}
                            {avatarPreview && (
                                <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/20">
                                    <img src={avatarPreview} alt="Preview" className="w-16 h-16 rounded-xl object-cover border-2 border-primary/30" />
                                    <div>
                                        <p className="text-sm font-semibold text-primary">Ảnh mới đã chọn</p>
                                        <p className="text-xs text-gray-500">Nhấn "Lưu thay đổi" để cập nhật</p>
                                        <button
                                            type="button"
                                            onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                                            className="text-xs text-red-400 hover:text-red-600 mt-1"
                                        >
                                            Hủy đổi ảnh
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Full Name */}
                            <div className="grid gap-5 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-gray-700">Họ và tên</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2">
                                            <span className="material-symbols-outlined text-gray-400 text-[20px]">person</span>
                                        </span>
                                        <input
                                            type="text"
                                            value={editForm.fullName}
                                            onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                                            placeholder="Nhập họ và tên..."
                                            className="field-control pl-10"
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-gray-700">Số điện thoại</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2">
                                            <span className="material-symbols-outlined text-gray-400 text-[20px]">phone</span>
                                        </span>
                                        <input
                                            type="tel"
                                            value={editForm.phone}
                                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                            placeholder="Nhập số điện thoại..."
                                            className="field-control pl-10"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700">Email</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2">
                                        <span className="material-symbols-outlined text-gray-400 text-[20px]">mail</span>
                                    </span>
                                    <input
                                        type="email"
                                        value={displayUser?.email || ""}
                                        readOnly
                                        className="field-control cursor-not-allowed bg-gray-50 pl-10 text-gray-400"
                                    />
                                </div>
                                <p className="text-xs text-gray-400">Email dùng cho đăng nhập nên không thể thay đổi tại đây.</p>
                            </div>

                            {/* Feedback messages */}
                            {successMsg && (
                                <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold bg-emerald-50 px-4 py-3 rounded-xl">
                                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                    {successMsg}
                                </div>
                            )}
                            {errorMsg && (
                                <div className="flex items-center gap-2 text-red-600 text-sm font-semibold bg-red-50 px-4 py-3 rounded-xl">
                                    <span className="material-symbols-outlined text-[18px]">error</span>
                                    {errorMsg}
                                </div>
                            )}

                            {/* Submit */}
                            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            Đang lưu...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[18px]">save</span>
                                            Lưu thay đổi
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="btn-secondary"
                                >
                                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                                    Đổi ảnh đại diện
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ─── Tab: Lịch sử đặt sân ──────────────────────────── */}
                {activeTab === "bookings" && (
                    <div className="space-y-4">
                        {/* Review success toast */}
                        {reviewSuccess && (
                            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-semibold animate-fadeIn">
                                <span className="material-symbols-outlined text-emerald-500 text-[22px]">check_circle</span>
                                <div>
                                    <p className="font-bold">Đánh giá thành công!</p>
                                    <p className="text-sm font-normal text-emerald-600">Bạn đã nhận được 20 điểm thưởng vào ví tích lũy.</p>
                                </div>
                            </div>
                        )}

                        {loadingBookings ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-white rounded-2xl border border-gray-100 h-24 animate-pulse" />
                                ))}
                            </div>
                        ) : bookings.length === 0 ? (
                            <div className="surface-panel py-20 text-center">
                                <div className="w-20 h-20 mx-auto bg-primary/5 rounded-full flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-primary/40 text-5xl">calendar_month</span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-700 mb-2">Chưa có lịch sử đặt sân</h3>
                                <p className="text-sm text-gray-400 mb-6">Bạn chưa từng đặt sân pickleball nào. Hãy khám phá ngay!</p>
                                <button
                                    onClick={() => navigate("/courts")}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-[18px]">search</span>
                                    Tìm sân ngay
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <h2 className="text-base font-bold text-gray-700">
                                        Tổng cộng {bookings.length} đơn đặt sân
                                    </h2>
                                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">star</span>
                                        Nhấn "Đánh giá" trên đơn đã hoàn thành để nhận điểm thưởng
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    {bookings.map(booking => (
                                        <BookingCard
                                            key={booking._id}
                                            booking={booking}
                                            onCancel={handleCancelBooking}
                                            onReview={setReviewTarget}
                                            onRepay={setPayingBooking}
                                            onViewDetail={setDetailTarget}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
                    </section>
                </div>
            </div>

            {/* ─── Review Modal ──────────────────────────────────────── */}
            {reviewTarget && (
                <ReviewModal
                    booking={reviewTarget}
                    onClose={() => setReviewTarget(null)}
                    onSuccess={handleReviewSuccess}
                />
            )}

            {/* ─── Detail Modal ──────────────────────────────────────── */}
            {detailTarget && (
                <BookingDetailModal
                    booking={detailTarget}
                    onClose={() => setDetailTarget(null)}
                />
            )}

            {/* ─── Repay Modal ───────────────────────────────────────── */}
            {payingBooking && (
                <RepayModal
                    booking={payingBooking}
                    onClose={() => setPayingBooking(null)}
                    onSuccess={() => { setPayingBooking(null); fetchBookings(); }}
                />
            )}
        </div>
    );
}
