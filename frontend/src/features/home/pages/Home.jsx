import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { courtService } from "@/services/court.service";
import CourtCard from "@/components/CourtCard";
import SkeletonCard from "@/components/SkeletonCard";

const heroImage = "https://res.cloudinary.com/djasmz67j/image/upload/v1779472663/7c3a1ab9-74f8-40df-b87a-379c18191099.png";

export default function Home() {
    const navigate = useNavigate();
    const [featuredCourts, setFeaturedCourts] = useState([]);
    const [searchLocation, setSearchLocation] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        courtService.getCourts({ limit: 3 })
            .then(res => {
                setFeaturedCourts(res?.success && Array.isArray(res.courts) ? res.courts : []);
            })
            .catch(() => setFeaturedCourts([]))
            .finally(() => setIsLoading(false));
    }, []);

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        if (!searchLocation.trim()) return;
        navigate(`/courts?location=${encodeURIComponent(searchLocation.trim())}`);
    };

    return (
        <div className="bg-[#fafbf9]">
            <section className="relative overflow-hidden bg-zinc-950 text-white">
                <div className="noise-layer absolute inset-0 opacity-20" />
                <div className="absolute inset-0">
                    <img
                        alt="Sân pickleball chuyên nghiệp"
                        className="h-full w-full object-cover opacity-50"
                        src={heroImage}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
                </div>

                <div className="app-shell relative grid min-h-[85dvh] items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
                    <div className="max-w-3xl">
                        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-primary">
                            Đặt sân theo thời gian thực
                        </p>
                        <h1 className="max-w-2xl text-pretty text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl">
                            Chọn sân nhanh.<br />Vào trận đúng giờ.
                        </h1>
                        <p className="mt-5 max-w-xl text-pretty text-sm md:text-base text-zinc-300 leading-relaxed">
                            PickleballPro gom lịch sân, thanh toán, dụng cụ thuê kèm và đánh giá đã xác thực vào một trải nghiệm gọn gàng cho người chơi bận rộn.
                        </p>

                        <form onSubmit={handleSearchSubmit} className="mt-8 max-w-xl rounded-2xl bg-white p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-zinc-200/20">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3">
                                    <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
                                    <input
                                        type="text"
                                        placeholder="Nhập khu vực, ví dụ Thủ Đức hoặc Quận 7..."
                                        value={searchLocation}
                                        onChange={(event) => setSearchLocation(event.target.value)}
                                        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-zinc-800 placeholder-zinc-400 outline-none"
                                    />
                                </div>
                                <button type="submit" className="btn-primary py-2.5 px-4 whitespace-nowrap text-xs">
                                    Tìm sân
                                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </button>
                            </div>
                        </form>
                        <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold text-zinc-400">
                            <span>Slot realtime</span>
                            <span className="text-zinc-600">/</span>
                            <span>Giá công khai</span>
                            <span className="text-zinc-600">/</span>
                            <span>Review đã xác thực</span>
                        </div>
                    </div>

                    <div className="hidden lg:block">
                        <div className="media-card ml-auto max-w-md p-4">
                            <div className="overflow-hidden rounded-xl">
                                <img
                                    src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1400"
                                    alt="Người chơi pickleball trên sân xanh"
                                    className="h-60 w-full object-cover opacity-90 transition-transform duration-700 hover:scale-103"
                                />
                            </div>
                            <div className="mt-4 grid grid-cols-[0.8fr_1.2fr] gap-3">
                                <div className="rounded-xl bg-white/5 p-4 border border-white/5">
                                    <p className="text-2xl font-bold tracking-tight">24/7</p>
                                    <p className="mt-1 text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Realtime flow</p>
                                </div>
                                <div className="rounded-xl bg-white/5 p-4 border border-white/5">
                                    <p className="text-xs font-bold text-zinc-200">Không giữ lịch ảo</p>
                                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">Slot cập nhật theo booking thật, giúp bạn chọn giờ nhanh hơn.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="app-shell py-14 lg:py-20">
                <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="section-heading">Sân nổi bật</h2>
                        <p className="muted-copy mt-2 max-w-xl">Các cụm sân đang sẵn sàng đặt lịch, có ảnh thật, giá rõ ràng và thống kê tương tác.</p>
                    </div>
                    <Link to="/courts" className="btn-secondary py-2.5 px-4 w-fit text-xs">
                        Xem tất cả
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {isLoading ? (
                        [1, 2, 3].map(item => <SkeletonCard key={item} />)
                    ) : featuredCourts.length > 0 ? (
                        featuredCourts.map(court => <CourtCard key={court._id || court.id} court={court} />)
                    ) : (
                        <div className="surface-panel-flat col-span-full p-10 text-center">
                            <h3 className="text-base font-bold text-zinc-800">Chưa có sân khả dụng</h3>
                            <p className="muted-copy mx-auto mt-2 max-w-lg">Khi admin thêm sân đang hoạt động, danh sách nổi bật sẽ tự cập nhật tại đây.</p>
                        </div>
                    )}
                </div>
            </section>

            <section className="border-t border-zinc-200/50 bg-zinc-50/50">
                <div className="app-shell grid gap-10 py-16 md:grid-cols-[0.85fr_1.15fr] lg:py-20">
                    <div>
                        <h2 className="section-heading max-w-xl">Một luồng đặt sân đủ rõ cho cả người chơi lẫn vận hành.</h2>
                        <p className="muted-copy mt-4 max-w-md font-medium">Thiết kế lại quanh các quyết định thật: chọn sân, chọn giờ, thêm dụng cụ, thanh toán và quay lại đánh giá.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {[
                            ["calendar_month", "Lịch sân trực quan", "Ma trận giờ giúp người chơi thấy ngay slot trống và slot đã kín.", "bg-emerald-50/20 border-emerald-500/10"],
                            ["payments", "Chi phí minh bạch", "Tách tiền sân, thiết bị, phí hệ thống, coupon và điểm dùng trong checkout.", "bg-white"],
                            ["verified", "Đánh giá xác thực", "Chỉ booking đã hoàn tất mới được đánh giá, hạn chế bình luận ảo.", "bg-white"],
                            ["dashboard_customize", "Quản trị tinh gọn", "Dashboard, đơn hàng, thiết bị và coupon đồng bộ chung một ngôn ngữ thiết kế.", "bg-blue-50/10 border-blue-500/5"],
                        ].map(([icon, title, text, bg]) => (
                            <div key={title} className={`surface-panel-flat p-6 flex flex-col justify-between ${bg} border border-zinc-200/40`}>
                                <div>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-primary mb-4">
                                        <span className="material-symbols-outlined text-[18px]">{icon}</span>
                                    </div>
                                    <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
                                    <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
