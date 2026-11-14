// src/features/court/pages/CourtDetail.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { courtService } from "@/services/court.service";
import { useAuthStore } from "@/store/authStore";
import CourtBookingModal from "@/components/CourtBookingModal";
import { engagementService } from "@/services/engagement.service";
import FavoriteButton from "@/components/FavoriteButton";
import ReviewsSection from "@/components/ReviewsSection";
import CourtRail from "@/components/CourtRail";

export default function CourtDetail() {
    const { id } = useParams();
    const [court, setCourt] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [loadedKey, setLoadedKey] = useState("");
    const [availabilityVersion, setAvailabilityVersion] = useState(0);
    const [bookingNotice, setBookingNotice] = useState("");

    // 🎯 FIX LỆCH MÚI GIỜ: Sử dụng format ngày sv-SE (YYYY-MM-DD) chuẩn múi giờ địa phương đồng bộ với Backend
    const [searchParams, setSearchParams] = useSearchParams();
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
    const selectedDate = searchParams.get("date") || today;

    // 🎯 DATA THẬT: Nhận danh sách ma trận timeline từ API Backend mới
    const [subCourtsTimeline, setSubCourtsTimeline] = useState([]);

    // 🎯 CHỐT CHẶN BOOKING ENGINE: Lưu trữ thông tin ô giờ thật khi người chơi click chọn
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();

    // Booking modal states
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [similarCourts, setSimilarCourts] = useState([]);
    const [recentCourts, setRecentCourts] = useState([]);
    const handleOpenBooking = () => {
        if (!isAuthenticated) { navigate("/login"); return; }
        if (selectedSlot) setShowBookingModal(true);
    };
    const handleSlotConflict = (slotId, message, code) => {
        setShowBookingModal(false);
        setSelectedSlot(null);
        setBookingNotice(message);
        // Disable the stale choice immediately while retrieving the authoritative schedule.
        setSubCourtsTimeline(items => items.map(sub => ({ ...sub,
            slots: sub.slots.map(slot => slot._id === slotId ? {
                ...slot, isBooked: code === "SLOT_ALREADY_BOOKED", isUnavailable: true
            } : slot)
        })));
        setAvailabilityVersion(version => version + 1);
    };

    useEffect(() => {
        let isMounted = true;

        courtService.getCourtDetail(id, selectedDate)
            .then(res => {
                if (res.success && isMounted) {
                    // Phòng thủ bóc tách vỏ dữ liệu Object lặp từ Backend
                    const cleanCourtData = res.court?.court ? res.court.court : res.court;
                    setError("");
                    setCourt(cleanCourtData);
                    setLoadedKey(`${id}:${selectedDate}`);
                    setActiveImageIndex(0);

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
    }, [id, selectedDate, availabilityVersion]);

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
        if (!e.target.value || e.target.value === selectedDate) return;
        setIsLoading(true);
        setBookingNotice("");
        setSelectedSlot(null);
        setShowBookingModal(false);
        const params = new URLSearchParams(searchParams);
        params.set("date", e.target.value);
        setSearchParams(params);
    };

    if (isLoading || (!error && loadedKey !== `${id}:${selectedDate}`)) {
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

    const globalTimeSlots = [...new Set(subCourtsTimeline.flatMap(sub => sub.slots.map(slot => slot.startTime)))].sort();

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
                    {bookingNotice && <div role="alert" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        {bookingNotice}
                    </div>}

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
                                        const minutes = time => time.split(":").map(Number).reduce((hour, minute) => hour * 60 + minute);
                                        const durationHours = selectedSlot ? (minutes(selectedSlot.endTime) - minutes(selectedSlot.time)) / 60 : (court.slotDuration || 60) / 60;
                                        const basePrice = Math.round(court.pricePerHour * durationHours);
                                        const fee = Math.round(basePrice * 0.05);
                                        const total = basePrice + fee;
                                        return (
                                            <div className="space-y-2.5 pt-2 text-xs font-semibold text-on-surface-variant">
                                                <div className="flex justify-between">
                                                    <span>Tiền thuê sân ({durationHours * 60} phút)</span>
                                                    <span>{basePrice.toLocaleString("vi-VN")}đ</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Thuế phí dịch vụ hệ thống (5%)</span>
                                                    <span>{fee.toLocaleString("vi-VN")}đ</span>
                                                </div>
                                                <div className="flex justify-between font-black text-sm pt-4 border-t border-dashed border-outline-variant text-on-surface">
                                                    <span>Tổng chi phí thanh toán tại sân</span>
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
                                    <p className="text-center text-[10px] text-outline font-medium">Thanh toán tại sân sau khi lịch được xác nhận.</p>
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
                                    min={today}
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
                                                                ) : isBooked || matchedSlot?.isUnavailable ? (
                                                                    <button type="button" disabled aria-label={`${subCourt.name}, ${time}: ${isBooked && matchedSlot ? "Đã có người đặt" : "Không khả dụng"}`} className="w-full h-9 rounded-lg bg-zinc-100 text-zinc-400/80 text-[10px] font-bold flex items-center justify-center cursor-not-allowed">{isBooked && matchedSlot ? "Đã đặt" : "—"}</button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        aria-label={`${subCourt.name}, ${time}: Trống`}
                                                                        onClick={() => { setBookingNotice(""); setSelectedSlot({
                                                                            slotId: matchedSlot._id,
                                                                            courtName: subCourt.name,
                                                                            time: matchedSlot.startTime,
                                                                            endTime: matchedSlot.endTime
                                                                        }); }}
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
            {showBookingModal && selectedSlot && <CourtBookingModal
                court={court} slot={selectedSlot} date={selectedDate}
                onClose={() => { setShowBookingModal(false); setSelectedSlot(null); }}
                onSlotConflict={handleSlotConflict}
                onBooked={slotId => setSubCourtsTimeline(items => items.map(sub => ({ ...sub,
                    slots: sub.slots.map(slot => slot._id === slotId ? { ...slot, isBooked: true } : slot)
                })))}
            />}
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
