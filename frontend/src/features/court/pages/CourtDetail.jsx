// src/features/court/pages/CourtDetail.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { courtService } from "@/services/court.service";
import { useAuthStore } from "@/store/authStore";
import { userService } from "@/services/user.service";
import { commerceService } from "@/services/commerce.service";
import { engagementService } from "@/services/engagement.service";
import FavoriteButton from "@/components/FavoriteButton";
import ReviewsSection from "@/components/ReviewsSection";
import CourtRail from "@/components/CourtRail";

export default function CourtDetail() {
    const { id } = useParams();
    const [court, setCourt] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // 🎯 FIX LỆCH MÚI GIỜ: Sử dụng format ngày sv-SE (YYYY-MM-DD) chuẩn múi giờ địa phương đồng bộ với Backend
    const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString("sv-SE"));

    // 🎯 DATA THẬT: Nhận danh sách ma trận timeline từ API Backend mới
    const [subCourtsTimeline, setSubCourtsTimeline] = useState([]);

    // 🎯 CHỐT CHẶN BOOKING ENGINE: Lưu trữ thông tin ô giờ thật khi người chơi click chọn
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();

    // Booking modal states
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [equipments, setEquipments] = useState([]);
    const [selectedEquipments, setSelectedEquipments] = useState({}); // { equipmentId: quantity }
    const [note, setNote] = useState("");
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingError, setBookingError] = useState("");
    const [couponCode, setCouponCode] = useState("");
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [couponMessage, setCouponMessage] = useState("");
    const [pointWallet, setPointWallet] = useState(null);
    const [pointsToUse, setPointsToUse] = useState(0);
    const [pointToVnd, setPointToVnd] = useState(1000);
    // ✅ Fix Section 13: Cho user chọn phương thức thanh toán thay vì hardcode
    const [paymentMethod, setPaymentMethod] = useState("BANKING");
    const [similarCourts, setSimilarCourts] = useState([]);
    const [recentCourts, setRecentCourts] = useState([]);

    // Payment modal states
    const [bookingSuccessData, setBookingSuccessData] = useState(null);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    const handleOpenBooking = async () => {
        if (!isAuthenticated) {
            alert("Vui lòng đăng nhập để thực hiện đặt sân!");
            navigate("/login");
            return;
        }
        if (!selectedSlot) return;

        setShowBookingModal(true);
        setBookingError("");
        setCouponMessage("");
        try {
            const [res, walletRes] = await Promise.all([
                // ✅ Fix #5: Truyền courtId để lọc thiết bị đúng theo sân đang xem
                userService.getEquipments(id),
                commerceService.getPointWallet()
            ]);
            if (res.success) {
                setEquipments(res.equipments || []);
                const initialSelected = {};
                res.equipments.forEach(eq => {
                    initialSelected[eq._id] = 0;
                });
                setSelectedEquipments(initialSelected);
            }
            if (walletRes.success) {
                setPointWallet(walletRes.wallet);
                setPointToVnd(walletRes.pointToVnd || 1000);
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách thiết bị:", err);
        }
    };

    const handleQtyChange = (eqId, val, maxQty) => {
        const num = parseInt(val) || 0;
        if (num < 0) return;
        if (num > maxQty) {
            alert(`Chỉ còn tối đa ${maxQty} sản phẩm trong kho!`);
            return;
        }
        setSelectedEquipments(prev => ({
            ...prev,
            [eqId]: num
        }));
    };

    const getEquipmentPrice = () => {
        let total = 0;
        const durationHours = court.slotDuration / 60 || 1;
        equipments.forEach(eq => {
            const qty = selectedEquipments[eq._id] || 0;
            if (qty > 0) {
                const subtotal = eq.rentalType === "HOUR"
                    ? eq.rentalPrice * qty * durationHours
                    : eq.rentalPrice * qty;
                total += subtotal;
            }
        });
        return total;
    };

    const getBaseCourtPrice = () => court.pricePerHour * (court.slotDuration / 60 || 1);
    const getSystemFee = () => Math.round((getBaseCourtPrice() + getEquipmentPrice()) * 0.05);
    const getSubtotal = () => getBaseCourtPrice() + getEquipmentPrice() + getSystemFee();
    const getPointDiscount = () => Math.min((parseInt(pointsToUse) || 0) * pointToVnd, Math.max(0, getSubtotal() - couponDiscount));
    const getFinalTotal = () => Math.max(0, getSubtotal() - couponDiscount - getPointDiscount());

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) {
            setCouponDiscount(0);
            setCouponMessage("");
            return;
        }

        try {
            const res = await commerceService.validateCoupon({
                code: couponCode,
                orderValue: getSubtotal(),
                courtId: id
            });
            if (res.success) {
                setCouponDiscount(res.discountAmount || 0);
                setCouponMessage(`Đã áp dụng mã ${res.coupon.code}, giảm ${(res.discountAmount || 0).toLocaleString("vi-VN")}đ`);
            }
        } catch (error) {
            setCouponDiscount(0);
            setCouponMessage(error.response?.data?.message || "Mã giảm giá không hợp lệ!");
        }
    };

    const handleConfirmBooking = async () => {
        setBookingLoading(true);
        setBookingError("");
        try {
            const reqEquipments = Object.entries(selectedEquipments)
                .filter(([, qty]) => qty > 0)
                .map(([eqId, qty]) => ({
                    equipmentId: eqId,
                    quantity: qty
                }));

            const payload = {
                slotId: selectedSlot.slotId,
                equipments: reqEquipments,
                paymentMethod, // ✅ Fix Section 13: Dùng state thay vì hardcode "BANKING"
                note,
                couponCode: couponCode.trim(),
                pointsToUse: parseInt(pointsToUse) || 0
            };

            const res = await userService.createBooking(payload);
            if (res.success && res.bookingId) {
                try {
                    const paymentRes = await userService.getPaymentIntent(res.bookingId);
                    if (paymentRes.success) {
                        setBookingSuccessData({
                            bookingId: res.bookingId,
                            bookingCode: res.bookingCode,
                            totalPrice: res.totalPrice,
                            discount: res.discount,
                            rewardMessage: res.pointsUsed > 0 ? `Bạn đã dùng ${res.pointsUsed} điểm.` : "",
                            qrCodeUrl: paymentRes.qrCodeUrl,
                            paymentDescription: paymentRes.paymentDescription
                        });
                    } else {
                        setBookingSuccessData({
                            bookingId: res.bookingId,
                            bookingCode: res.bookingCode,
                            totalPrice: res.totalPrice,
                            discount: res.discount,
                            qrCodeUrl: `https://img.vietqr.io/image/MB-0900000002-qr_only.png?amount=${res.totalPrice}&addInfo=CHUYEN%20TIEN%20SAN%20${res.bookingCode}`
                        });
                    }
                } catch {
                    setBookingSuccessData({
                        bookingId: res.bookingId,
                        bookingCode: res.bookingCode,
                        totalPrice: res.totalPrice,
                        discount: res.discount,
                        qrCodeUrl: `https://img.vietqr.io/image/MB-0900000002-qr_only.png?amount=${res.totalPrice}&addInfo=CHUYEN%20TIEN%20SAN%20${res.bookingCode}`
                    });
                }
            }
        } catch (err) {
            setBookingError(err.response?.data?.message || "Đặt sân thất bại. Vui lòng thử lại!");
        } finally {
            setBookingLoading(false);
        }
    };

    const handleVerifyPayment = async () => {
        if (!bookingSuccessData) return;
        setPaymentLoading(true);
        try {
            // ✅ Fix #4: Dùng state paymentMethod thay vì hardcode "BANKING"
            const res = await userService.confirmPayment(bookingSuccessData.bookingId, paymentMethod);
            if (res.success) {
                setPaymentSuccess(true);
                // Cập nhật lại sơ đồ sân
                courtService.getCourtDetail(id, selectedDate)
                    .then(r => {
                        if (r.success) {
                            const cleanCourtData = r.court?.court ? r.court.court : r.court;
                            setCourt(cleanCourtData);
                            setSubCourtsTimeline(r.subCourtsTimeline || r.court?.subCourtsTimeline || []);
                            setSelectedSlot(null);
                        }
                    });
            }
        } catch (err) {
            alert(err.response?.data?.message || "Không thể xác minh thanh toán!");
        } finally {
            setPaymentLoading(false);
        }
    };

    const handleCloseAll = () => {
        setShowBookingModal(false);
        setBookingSuccessData(null);
        setPaymentSuccess(false);
        setNote("");
        setSelectedEquipments({});
        setCouponCode("");
        setCouponDiscount(0);
        setCouponMessage("");
        setPointsToUse(0);
        setPaymentMethod("BANKING"); // Reset về mặc định
    };

    useEffect(() => {
        let isMounted = true;

        courtService.getCourtDetail(id, selectedDate)
            .then(res => {
                if (res.success && isMounted) {
                    // Phòng thủ bóc tách vỏ dữ liệu Object lặp từ Backend
                    const cleanCourtData = res.court?.court ? res.court.court : res.court;
                    setCourt(cleanCourtData);

                    // Bốc đúng mảng ma trận sân thi đấu nhỏ
                    setSubCourtsTimeline(res.subCourtsTimeline || res.court?.subCourtsTimeline || []);
                    setSelectedSlot(null); // Reset slot khi đổi ngày chơi
                }
            })
            .catch(err => {
                if (isMounted) setError(err.response?.data?.message || "Không thể tải chi tiết cụm sân này!");
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => { isMounted = false; };
    }, [id, selectedDate]);

    useEffect(() => {
        let mounted = true;

        engagementService.recordView(id)
            .then(res => {
                if (res.guestId) localStorage.setItem("pickleball-guest-id", res.guestId);
            })
            .catch(() => {});

        Promise.all([
            engagementService.getSimilarCourts(id),
            engagementService.getRecentlyViewed()
        ]).then(([similarRes, recentRes]) => {
            if (!mounted) return;
            if (similarRes.success) setSimilarCourts(similarRes.courts || []);
            if (recentRes.success) setRecentCourts((recentRes.courts || []).filter(item => item._id !== id));
        }).catch(() => {});

        return () => { mounted = false; };
    }, [id]);

    // Hàm xử lý khi người dùng đổi ngày chơi trên bộ lịch UI
    const handleDateChange = (e) => {
        setIsLoading(true);
        setSelectedDate(e.target.value);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background pt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-surface-container rounded w-1/4" />
                        <div className="h-96 bg-surface-container rounded-2xl" />
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="h-32 bg-surface-container rounded-2xl" />
                                <div className="h-48 bg-surface-container rounded-2xl" />
                            </div>
                            <div className="h-96 bg-surface-container rounded-2xl" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !court) {
        return (
            <div className="min-h-screen bg-background pt-16 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-6">
                    <div className="w-24 h-24 mx-auto bg-error/10 rounded-full flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-error text-5xl">error</span>
                    </div>
                    <h3 className="text-2xl font-bold text-on-surface mb-3">{error || "Cụm sân không tồn tại"}</h3>
                    <p className="text-on-surface-variant mb-6">Có vẻ như địa chỉ bạn truy cập không chính xác.</p>
                    <Link to="/courts" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        Quay lại danh sách
                    </Link>
                </div>
            </div>
        );
    }

    // 🎯 CLOUDINARY CONVERT: Biến đổi mảng Object ảnh của database mới thành mảng chuỗi URL sạch
    const images = court.images?.length > 0
        ? court.images.map(imgObj => imgObj.imageUrl)
        : [
            "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1200",
            "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=800",
            "https://images.unsplash.com/photo-1542144557-f550eeed3b6c?q=80&w=800"
        ];

    const globalTimeSlots = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];

    return (
        <div className="min-h-screen bg-background pt-0 font-lexend">
            {/* Gallery Header Section */}
            <div className="relative bg-surface-container">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
                    <div className="flex items-center gap-2 text-sm mb-6">
                        <Link to="/courts" className="text-on-surface-variant hover:text-primary transition-colors">Sân bóng</Link>
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">chevron_right</span>
                        <span className="text-primary font-medium">{court.name}</span>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
                        <div>
                            <h1 className="text-4xl lg:text-5xl font-bold text-on-surface tracking-tight mb-3">{court.name}</h1>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <div className="flex items-center gap-1.5">
                                    <div className="flex items-center gap-0.5">
                                        {[1,2,3,4,5].map((star) => (
                                            <span
                                                key={star}
                                                className={`material-symbols-outlined text-[18px] ${star <= Math.round(court.averageRating || 0) ? "text-amber-400" : "text-gray-300"}`}
                                                style={{ fontVariationSettings: star <= Math.round(court.averageRating || 0) ? "'FILL' 1" : "'FILL' 0" }}
                                            >
                                                star
                                            </span>
                                        ))}
                                    </div>
                                    <span className="font-semibold text-on-surface">{court.averageRating || 0}</span>
                                    <span className="text-on-surface-variant">({court.reviewCount || 0} đánh giá)</span>
                                </div>
                                <div className="w-1 h-1 bg-outline-variant rounded-full" />
                                <div className="flex items-center gap-1.5 text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[18px]">favorite</span>
                                    <span>{court.favoriteCount || 0} yêu thích</span>
                                </div>
                                <div className="w-1 h-1 bg-outline-variant rounded-full" />
                                <div className="flex items-center gap-1.5 text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                    <span>{court.viewCount || 0} lượt xem</span>
                                </div>
                                <div className="w-1 h-1 bg-outline-variant rounded-full" />
                                <div className="flex items-center gap-1.5 text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[18px]">payments</span>
                                    <span>{court.bookingCount || 0} lượt đặt</span>
                                </div>
                                <div className="w-1 h-1 bg-outline-variant rounded-full" />
                                <div className="flex items-center gap-1.5 text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[18px]">location_on</span>
                                    <span>{court.address || court.location}</span>
                                </div>
                            </div>
                        </div>
                        <FavoriteButton courtId={court._id} />
                    </div>

                    {/* Layout 2 cột: Ảnh bên trái, Booking bên phải */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* CỘT TRÁI: Ảnh chính + thumbnail strip */}
                        <div className="lg:col-span-7 flex flex-col gap-3">
                            {/* Ảnh chính */}
                            <div className="relative rounded-2xl overflow-hidden bg-surface-container-high group h-[380px] lg:h-[440px]">
                                <img
                                    src={images[activeImageIndex]}
                                    alt={court.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                                {/* Số thứ tự ảnh */}
                                <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                    {activeImageIndex + 1} / {images.length}
                                </div>
                            </div>

                            {/* Thumbnail strip ngang - chỉ hiển thị ảnh thật, không lặp */}
                            {images.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                    {images.map((img, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setActiveImageIndex(idx)}
                                            className={`relative flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden transition-all duration-200 ${
                                                activeImageIndex === idx
                                                    ? 'ring-2 ring-primary ring-offset-1 opacity-100'
                                                    : 'opacity-60 hover:opacity-90'
                                            }`}
                                        >
                                            <img
                                                src={img}
                                                alt={`Ảnh ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* CỘT PHẢI: Booking panel sticky */}
                        <div className="lg:col-span-5">
                            <div className="sticky top-24 surface-panel overflow-hidden">
                                <div className="p-5 border-b border-outline-variant/30">
                                    <span className="text-xs font-bold text-primary block mb-1">Chi phí gốc cơ sở</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-primary">{court.pricePerHour?.toLocaleString("vi-VN")}đ</span>
                                        <span className="text-on-surface-variant text-xs font-semibold">/ giờ chơi</span>
                                    </div>
                                </div>

                                <div className="p-6 space-y-5">
                                    <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/40 text-xs font-semibold space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-on-surface-variant">Ngày đặt lịch:</span>
                                            <span className="text-on-surface font-bold">{selectedDate}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-on-surface-variant">Sân thi đấu:</span>
                                            <span className="text-primary font-black">{selectedSlot ? selectedSlot.courtName : "Chưa chọn"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-on-surface-variant">Khung giờ:</span>
                                             <span className="text-primary font-black">{selectedSlot ? `${selectedSlot.time} - ${selectedSlot.endTime || `${(parseInt(selectedSlot.time) + 1)}:00`}` : "Chưa chọn"}</span>
                                        </div>
                                    </div>

                                    {/* ✅ Fix #3: Tính đúng giá theo slotDuration thực tế (không hardcode 1 giờ) */}
                                    {(() => {
                                        const durationHours = (court.slotDuration || 60) / 60;
                                        const basePrice = court.pricePerHour * durationHours;
                                        const fee = Math.round(basePrice * 0.05);
                                        const total = basePrice + fee;
                                        return (
                                            <div className="space-y-2.5 pt-2 text-xs font-semibold text-on-surface-variant">
                                                <div className="flex justify-between">
                                                    <span>Tiền thuê sân ({court.slotDuration || 60} phút)</span>
                                                    <span>{basePrice.toLocaleString("vi-VN")}đ</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Thuế phí dịch vụ hệ thống (5%)</span>
                                                    <span>{fee.toLocaleString("vi-VN")}đ</span>
                                                </div>
                                                <div className="flex justify-between font-black text-sm pt-4 border-t border-dashed border-outline-variant text-on-surface">
                                                    <span>Tổng chi phí trả trước</span>
                                                    <span>{selectedSlot ? total.toLocaleString("vi-VN") : 0}đ</span>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <button
                                        onClick={handleOpenBooking}
                                        disabled={!selectedSlot}
                                        className={`w-full py-4 rounded-xl font-bold text-sm text-white transition-all shadow-md flex items-center justify-center gap-2 ${
                                            selectedSlot ? "bg-primary hover:bg-primary/90 hover:scale-[1.01] active:scale-98 cursor-pointer shadow-green-900/10" : "bg-outline-variant text-on-surface-variant/40 cursor-not-allowed"
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">calendar_checked</span>
                                        {selectedSlot ? `Tiến Hành Đặt Lịch` : "Vui lòng chọn Sân & Giờ trống"}
                                    </button>
                                    <p className="text-center text-[10px] text-outline font-medium">Hỗ trợ thanh toán bảo mật bằng ví điện tử Momo / VNPAY.</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Main Details Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="space-y-12">

                    {/* 📊 BẢNG MA TRẬN TIMELINE HIỂN THỊ DỮ LIỆU THẬT */}
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-zinc-200/50 shadow-[0_8px_30px_rgba(9,25,18,0.015)]">
                            <div>
                                <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[22px]">apps</span>
                                    Sơ đồ trạng thái sân theo thời gian thực
                                </h2>
                                <p className="text-xs text-zinc-400 mt-1 font-medium">Chọn ô giờ trống của từng sân thi đấu nhỏ để giữ chỗ lịch chơi</p>
                            </div>

                            <div className="relative w-full sm:w-60 shrink-0">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={handleDateChange}
                                    className="w-full px-4 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200 focus:outline-none focus:border-primary font-bold text-sm text-zinc-800 cursor-pointer shadow-sm focus:ring-4 focus:ring-primary/5"
                                />
                            </div>
                        </div>

                        <div className="bg-white border border-zinc-200/50 rounded-2xl shadow-[0_8px_30px_rgba(9,25,18,0.02)] overflow-hidden">
                            <div className="overflow-x-auto custom-scrollbar">
                                <div className="min-w-[1000px] divide-y divide-zinc-100">
                                    <div className="flex bg-zinc-50/50 h-12 items-center">
                                        <div className="w-52 shrink-0 pl-6 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Sân nhỏ</div>
                                        <div className="flex flex-grow justify-between">
                                            {globalTimeSlots.map((time) => (
                                                <div key={time} className="w-16 text-center text-xs font-bold text-zinc-500 tracking-tight border-l border-zinc-100/50">{time}</div>
                                            ))}
                                        </div>
                                    </div>

                                    {subCourtsTimeline.length === 0 ? (
                                        <div className="text-center py-12 text-xs font-bold text-zinc-400 bg-zinc-50/20">
                                            <span className="material-symbols-outlined block text-2xl text-zinc-300 mb-2">inbox</span>
                                            Chưa cấu hình các sân thi đấu nhỏ bên trong cụm sân này.
                                        </div>
                                    ) : (
                                        subCourtsTimeline.map((subCourt) => (
                                            <div key={subCourt._id} className="flex h-16 items-center hover:bg-zinc-50/40 transition-colors group">
                                                <div className="w-52 shrink-0 pl-6">
                                                    <p className="font-bold text-sm text-zinc-800 group-hover:text-primary transition-colors flex items-center gap-1.5">
                                                        {subCourt.name}
                                                        {subCourt.status === "MAINTENANCE" && (
                                                            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-semibold leading-none">Bảo trì</span>
                                                        )}
                                                    </p>
                                                    <span className="text-[10px] text-zinc-400 font-medium">Chuẩn USAPA</span>
                                                </div>

                                                <div className="flex flex-grow justify-between h-full items-center">
                                                    {globalTimeSlots.map((time) => {
                                                        const matchedSlot = subCourt.slots?.find(s => s.startTime === time);
                                                        const isBooked = matchedSlot ? matchedSlot.isBooked : true;
                                                        const isSelected = selectedSlot?.slotId === matchedSlot?._id;

                                                        return (
                                                            <div key={time} className="w-16 h-full border-l border-zinc-100/50 flex items-center justify-center px-1">
                                                                {matchedSlot?.isPast ? (
                                                                    <div className="w-full h-9 rounded-lg bg-zinc-200/30 text-zinc-400/70 text-[10px] font-bold flex items-center justify-center cursor-not-allowed">Đã qua</div>
                                                                ) : matchedSlot?.isMaintenance ? (
                                                                    <div className="w-full h-9 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60 text-[10px] font-bold flex items-center justify-center cursor-not-allowed">Bảo trì</div>
                                                                ) : isBooked ? (
                                                                    <div className="w-full h-9 rounded-lg bg-zinc-100 text-zinc-400/80 text-[10px] font-bold flex items-center justify-center cursor-not-allowed">Kín</div>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setSelectedSlot({
                                                                            slotId: matchedSlot._id,
                                                                            courtName: subCourt.name,
                                                                            time: matchedSlot.startTime,
                                                                            endTime: matchedSlot.endTime
                                                                        })}
                                                                        className={`w-full h-9 rounded-lg text-[11px] font-bold transition-all flex flex-col items-center justify-center ${
                                                                            isSelected
                                                                                ? "bg-primary text-white shadow-sm scale-95"
                                                                                : "bg-emerald-50/40 text-primary border border-emerald-100/60 hover:bg-primary/10 hover:border-primary"
                                                                        }`}
                                                                    >
                                                                        <span>Trống</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="bg-zinc-50/50 px-6 py-4 flex gap-6 text-[11px] font-semibold text-zinc-500 border-t border-zinc-100">
                                <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-emerald-50 border border-emerald-100" /><span>Còn trống</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-zinc-100" /><span>Đã kín lịch</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-primary" /><span>Đang chọn</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-zinc-200/30 border border-zinc-300/30" /><span>Đã trôi qua</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-amber-50 border border-amber-200/60" /><span>Đang bảo trì</span></div>
                            </div>
                        </div>
                    </div>

                    {/* CHI TIẾT TIỆN ÍCH - Full width dưới timeline */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-2">
                        <div className="lg:col-span-12 space-y-10">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div className="surface-panel-flat rounded-2xl p-4 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-2xl text-primary">sports_tennis</span>
                                    <div>
                                        <p className="text-[11px] text-outline font-bold">Môi trường</p>
                                        <p className="font-bold text-sm text-on-surface mt-0.5">{court.type === "INDOOR" ? "Sân Trong nhà" : "Sân Ngoài trời"}</p>
                                    </div>
                                </div>
                                <div className="surface-panel-flat rounded-2xl p-4 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-2xl text-primary">schedule</span>
                                    <div>
                                        <p className="text-[11px] text-outline font-bold">Thời gian hoạt động</p>
                                        <p className="font-bold text-sm text-on-surface mt-0.5">{court.openTime || "06:00"} - {court.closeTime || "22:00"}</p>
                                    </div>
                                </div>
                                <div className="surface-panel-flat rounded-2xl p-4 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-2xl text-primary">timer</span>
                                    <div>
                                        <p className="text-[11px] text-outline font-bold">Thời lượng block</p>
                                        <p className="font-bold text-sm text-on-surface mt-0.5">{court.slotDuration || 60} phút / slot</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-2xl font-bold text-on-surface">Giới thiệu cụm sân</h2>
                                <p className="text-on-surface-variant leading-relaxed text-sm">{court.description || "Trải nghiệm sân pickleball đẳng cấp hàng đầu tại cụm sân chuyên nghiệp với mặt sân đạt chuẩn quốc tế."}</p>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold text-on-surface">Tiện ích miễn phí đi kèm</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {(court.amenities?.length > 0 ? court.amenities : ["Wifi miễn phí", "Bãi xe ô tô", "Phòng tắm nước nóng"]).map((amenityName, idx) => (
                                        <div key={idx} className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-container-low/40 border border-outline-variant/20">
                                            <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                                            <span className="text-xs font-bold text-on-surface-variant">{amenityName}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
                <div className="mt-12 space-y-12">
                    <ReviewsSection courtId={court._id} court={court} />
                    <CourtRail title="Sân tương tự" courts={similarCourts} emptyText="Chưa tìm thấy sân tương tự phù hợp." />
                    <CourtRail title="Đã xem gần đây" courts={recentCourts} emptyText="Bạn chưa xem thêm sân nào khác gần đây." />
                </div>
            {showBookingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-xl shadow-[0_30px_70px_rgba(0,0,0,0.18)] border border-zinc-200/50 overflow-hidden transform scale-100 transition-all duration-300 max-h-[90vh] md:max-h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-zinc-100 bg-[#fafbf9] text-zinc-900 flex justify-between items-center flex-shrink-0">
                            <div>
                                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900">
                                    {!bookingSuccessData ? "Xác nhận Đặt lịch & Thuê Đồ" : "Thanh toán Đặt sân"}
                                </h3>
                                <p className="text-[10px] text-zinc-400 mt-1 font-medium">
                                    {!bookingSuccessData ? "Kiểm tra thông tin chi tiết và dụng cụ" : `Mã đơn hàng: #${bookingSuccessData.bookingCode}`}
                                </p>
                            </div>
                            {!paymentSuccess && (
                                <button
                                    onClick={handleCloseAll}
                                    className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-850 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        {!bookingSuccessData ? (
                            /* --- Bước 1: Chọn thuê thiết bị --- */
                            <div className="p-5 space-y-4 overflow-y-auto flex-grow custom-scrollbar">
                                {/* Slot Info */}
                                <div className="bg-emerald-50/40 border border-emerald-100/50 p-3.5 rounded-xl flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary text-[22px]">schedule</span>
                                    <div className="text-left">
                                        <p className="font-bold text-sm text-zinc-800 leading-tight">{selectedSlot?.courtName}</p>
                                        <p className="text-[11px] text-zinc-500 mt-1">
                                            Ngày chơi: <span className="font-bold text-zinc-700">{selectedDate}</span>
                                            {" · "}
                                             Giờ: <span className="font-bold text-primary">{selectedSlot?.time} - {selectedSlot?.endTime || `${(parseInt(selectedSlot?.time) + 1)}:00`}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Equipment List */}
                                <div className="space-y-2">
                                    <h4 className="text-[11px] font-bold text-zinc-450 uppercase tracking-wider">Thuê dụng cụ kèm theo</h4>
                                    {equipments.length === 0 ? (
                                        <p className="text-xs text-zinc-400">Không có dụng cụ khả dụng trong kho.</p>
                                    ) : (
                                        <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                            {equipments.map(eq => (
                                                <div key={eq._id} className="flex justify-between items-center p-3 bg-zinc-50/50 rounded-xl border border-zinc-200/50 hover:bg-zinc-50 hover:border-zinc-300/60 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        {eq.image && (
                                                            <img src={eq.image} alt={eq.name} className="w-10 h-10 rounded-lg object-cover border border-zinc-200/60 flex-shrink-0" />
                                                        )}
                                                        <div className="text-left">
                                                            <p className="font-bold text-xs text-zinc-800">{eq.name}</p>
                                                            <p className="text-[10px] text-zinc-550 mt-0.5">
                                                                {eq.rentalPrice.toLocaleString("vi-VN")}đ / {eq.rentalType === "HOUR" ? "giờ" : "lượt"}
                                                                {" · "}
                                                                Kho: <span className="font-semibold">{eq.availableQuantity}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQtyChange(eq._id, (selectedEquipments[eq._id] || 0) - 1, eq.availableQuantity)}
                                                            className="w-6 h-6 rounded-lg bg-white border border-zinc-200 flex items-center justify-center font-bold text-zinc-650 hover:bg-zinc-50 hover:border-zinc-350 transition-all active:scale-95"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="text-xs font-bold text-zinc-800 w-5 text-center">
                                                            {selectedEquipments[eq._id] || 0}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQtyChange(eq._id, (selectedEquipments[eq._id] || 0) + 1, eq.availableQuantity)}
                                                            className="w-6 h-6 rounded-lg bg-white border border-zinc-200 flex items-center justify-center font-bold text-zinc-650 hover:bg-zinc-50 hover:border-zinc-350 transition-all active:scale-95"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Payment Method Selector */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-zinc-450 uppercase tracking-wider">Phương thức thanh toán</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { value: "BANKING", label: "Chuyển khoản", icon: "account_balance" },
                                            { value: "MOMO", label: "Ví MoMo", icon: "account_balance_wallet" }
                                        ].map(method => (
                                            <button
                                                key={method.value}
                                                type="button"
                                                onClick={() => setPaymentMethod(method.value)}
                                                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all hover:scale-[1.01] active:scale-95 ${
                                                    paymentMethod === method.value
                                                        ? "border-primary bg-primary/8 text-primary"
                                                        : "border-zinc-200 bg-zinc-50/50 text-zinc-500 hover:border-zinc-300 hover:text-zinc-850"
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-[15px]">{method.icon}</span>
                                                {method.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Note */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-zinc-455 uppercase tracking-wider">Ghi chú gửi sân</label>
                                    <input
                                        type="text"
                                        placeholder="Ví dụ: Cần mượn thêm khăn lau hoặc nước uống..."
                                        value={note}
                                        onChange={e => setNote(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-xs focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none text-zinc-800 placeholder-zinc-400"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-zinc-455 uppercase tracking-wider">Mã giảm giá</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="VD: PICKLE20"
                                                value={couponCode}
                                                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                                className="min-w-0 flex-1 px-3.5 py-2.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-xs focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none text-zinc-800 placeholder-zinc-400"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleApplyCoupon}
                                                className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs font-bold transition-all hover:scale-[1.01] active:scale-95 shadow-sm"
                                            >
                                                Áp dụng
                                            </button>
                                        </div>
                                        {couponMessage && <p className="text-[10px] font-semibold text-primary">{couponMessage}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-zinc-455 uppercase tracking-wider">
                                            Dùng điểm ({pointWallet?.balance || 0} điểm)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={pointWallet?.balance || 0}
                                            value={pointsToUse}
                                            onChange={e => setPointsToUse(Math.min(parseInt(e.target.value) || 0, pointWallet?.balance || 0))}
                                            className="w-full px-3.5 py-2.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-xs focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none text-zinc-800 placeholder-zinc-400"
                                        />
                                        <p className="text-[10px] text-zinc-400 mt-1">1 điểm = {pointToVnd.toLocaleString("vi-VN")}đ</p>
                                    </div>
                                </div>

                                {/* Price breakdown */}
                                <div className="border-t border-zinc-200/60 pt-4 mt-4 space-y-2 text-xs text-zinc-500 text-left">
                                    <div className="flex justify-between">
                                        <span>Tiền thuê sân</span>
                                        <span className="font-bold text-zinc-800">{getBaseCourtPrice().toLocaleString("vi-VN")}đ</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Tiền thuê thiết bị</span>
                                        <span className="font-bold text-zinc-800">{getEquipmentPrice().toLocaleString("vi-VN")}đ</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Phí dịch vụ hệ thống (5%)</span>
                                        <span className="font-bold text-zinc-800">{getSystemFee().toLocaleString("vi-VN")}đ</span>
                                    </div>
                                    {couponDiscount > 0 && (
                                        <div className="flex justify-between text-emerald-600">
                                            <span>Giảm giá coupon</span>
                                            <span className="font-bold">-{couponDiscount.toLocaleString("vi-VN")}đ</span>
                                        </div>
                                    )}
                                    {getPointDiscount() > 0 && (
                                        <div className="flex justify-between text-emerald-600">
                                            <span>Giảm bằng điểm</span>
                                            <span className="font-bold">-{getPointDiscount().toLocaleString("vi-VN")}đ</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span>Tạm tính</span>
                                        <span className="font-bold text-zinc-800">{getSubtotal().toLocaleString("vi-VN")}đ</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-xs pt-3 border-t border-zinc-200/60 text-zinc-800">
                                        <span>Tổng chi phí cần trả</span>
                                        <span className="text-primary text-base font-bold">
                                            {getFinalTotal().toLocaleString("vi-VN")}đ
                                        </span>
                                    </div>
                                </div>

                                {bookingError && (
                                    <p className="text-xs text-red-500 font-semibold">{bookingError}</p>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleCloseAll}
                                        className="flex-1 py-2.5 border border-zinc-200 hover:bg-zinc-55 hover:border-zinc-300 text-zinc-600 font-bold rounded-xl text-xs transition-all active:scale-[0.98]"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmBooking}
                                        disabled={bookingLoading}
                                        className="flex-1 py-2.5 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-primary/25 disabled:opacity-50 active:scale-[0.98]"
                                    >
                                        {bookingLoading ? "Đang xử lý..." : "Xác nhận Đặt sân"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* --- Bước 2: Thanh toán chuyển khoản ngân hàng thật --- */
                            <div className="p-5 space-y-4 text-center overflow-y-auto flex-grow custom-scrollbar">
                                {!paymentSuccess ? (
                                    <>
                                        <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                                            Quét mã QR bằng ứng dụng ngân hàng của bạn để chuyển khoản thanh toán tự động hoặc chuyển thủ công theo thông tin bên dưới:
                                        </p>
                                        <div className="w-40 h-40 mx-auto border-2 border-emerald-100/50 rounded-2xl overflow-hidden p-1 shadow-inner bg-emerald-50/10">
                                            <img
                                                src={bookingSuccessData.qrCodeUrl}
                                                alt="VietQR MBBank"
                                                className="w-full h-full object-contain animate-fadeIn"
                                            />
                                        </div>
                                        <div className="bg-zinc-50/55 p-3.5 rounded-2xl text-xs font-semibold text-zinc-650 space-y-1.5 border border-zinc-200/50 text-left max-w-sm mx-auto">
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Ngân hàng:</span>
                                                <span className="text-zinc-800">MB Bank (Quân Đội)</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Số tài khoản:</span>
                                                <span className="text-primary font-bold">0900000002</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Số tiền:</span>
                                                <span className="text-red-500 font-bold">{bookingSuccessData.totalPrice.toLocaleString("vi-VN")}đ</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Nội dung CK:</span>
                                                <span className="text-primary font-bold select-all">{bookingSuccessData.paymentDescription || `CHUYEN TIEN SAN ${bookingSuccessData.bookingCode}`}</span>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-zinc-400">Lưu ý: Nội dung chuyển khoản phải ghi chính xác để hệ thống tự động duyệt sân.</p>

                                        {/* Action buttons */}
                                        <div className="flex gap-3 pt-1.5 max-w-sm mx-auto">
                                            <button
                                                type="button"
                                                onClick={handleCloseAll}
                                                className="flex-1 py-2.5 border border-zinc-200 hover:bg-zinc-55 hover:border-zinc-300 text-zinc-600 font-bold rounded-xl text-xs transition-all active:scale-[0.98]"
                                            >
                                                Thanh toán sau
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleVerifyPayment}
                                                disabled={paymentLoading}
                                                className="flex-1 py-2.5 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                                            >
                                                {paymentLoading ? (
                                                    "Đang xác minh..."
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-[16px] animate-spin">autorenew</span>
                                                        Xác minh thanh toán
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-4 space-y-3">
                                        <div className="w-12 h-12 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-emerald-600 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-zinc-900">Đặt Sân Thành Công!</h4>
                                            <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
                                                Mã đơn hàng <span className="font-bold text-zinc-800">#{bookingSuccessData.bookingCode}</span> đã được chuyển trạng thái đã thanh toán. Sân chơi của bạn đã khóa giữ chỗ an toàn!
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleCloseAll}
                                            className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-primary/20 active:scale-[0.98]"
                                        >
                                            Xong
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
}
