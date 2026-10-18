// src/components/CourtCard.jsx
import { Link } from "react-router-dom";
import FavoriteButton from "@/components/FavoriteButton";

export default function CourtCard({ court }) {
    const imageUrl = court.images?.[0]?.imageUrl || "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1200";

    return (
        <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/50 bg-white shadow-[0_8px_30px_rgba(9,25,18,0.02)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(9,25,18,0.06)]">
            <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100">
                <img
                    alt={court.name}
                    className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-103"
                    src={imageUrl}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/40 to-transparent" />

                <span className={`absolute right-3.5 top-3.5 rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase ${court.type === "INDOOR" ? "bg-blue-600 text-white" : "bg-amber-600 text-white"}`}>
                    {court.type}
                </span>

                <div className="absolute top-3.5 left-3.5">
                    <FavoriteButton courtId={court._id} compact />
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-950/60 px-2.5 py-1 text-[10px] font-bold backdrop-blur-md">
                        <span className="material-symbols-outlined text-[14px] text-yellow-400">star</span>
                        {court.averageRating || 0}/5 từ {court.reviewCount || 0} review
                    </div>
                </div>
            </div>

            <div className="flex flex-grow flex-col justify-between p-5">
                <div>
                    <h3 className="mb-1 text-base font-bold text-zinc-900 group-hover:text-primary transition-colors duration-200 truncate" title={court.name}>
                        {court.name}
                    </h3>
                    <div className="mb-3.5 flex items-center gap-1 text-xs text-zinc-400">
                        <span className="material-symbols-outlined text-[15px]">location_on</span>
                        <span className="truncate">{court.address || court.location}</span>
                    </div>
                    <div className="mb-4 flex items-center gap-3 text-[11px] text-zinc-400 font-medium">
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">favorite</span>
                            {court.favoriteCount || 0} thích
                        </span>
                        <span className="h-2.5 w-px bg-zinc-200" />
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">event_available</span>
                            {court.bookingCount || 0} lượt đặt
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
                    <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Chi phí từ</p>
                        <p className="text-base font-bold text-primary tracking-tight">
                            {court.pricePerHour?.toLocaleString("vi-VN")}đ
                            <span className="text-[10px] font-normal text-zinc-400"> / giờ</span>
                        </p>
                    </div>
                    <Link
                        to={`/courts/${court._id}`}
                        className="group/btn inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3.5 py-2.5 text-xs font-bold text-white transition-all duration-200 hover:bg-primary active:scale-[0.98]"
                    >
                        Chi tiết
                        <span className="material-symbols-outlined ml-1 inline-block text-[14px] transition-transform group-hover/btn:translate-x-0.5">arrow_forward</span>
                    </Link>
                </div>
            </div>
        </article>
    );
}
