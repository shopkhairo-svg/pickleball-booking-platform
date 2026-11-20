import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { reviewService } from "@/services/review.service";

const formatDate = value => new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));

function Rating({ value }) {
    return <span className="inline-flex items-center gap-1 font-bold text-amber-700">
        <span className="material-symbols-outlined text-[18px]">star</span>{value}/5
    </span>;
}

function ReviewPost({ review }) {
    const court = review.courtId;
    return <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
                <img
                    src={review.userId?.avatar || "https://api.dicebear.com/7.x/initials/svg?seed=player"}
                    alt=""
                    className="h-10 w-10 rounded-full bg-zinc-100 object-cover"
                />
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-zinc-900">{review.userId?.fullName || "Người chơi"}</p>
                    <p className="text-xs text-zinc-500">Đã xác thực lượt chơi · {formatDate(review.createdAt)}</p>
                </div>
            </div>
            <Rating value={review.rating} />
        </div>
        <div className="p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Đánh giá sân</p>
                    <h2 className="mt-1 text-lg font-bold text-zinc-900">{court?.name || "Sân không còn hoạt động"}</h2>
                    <p className="mt-1 flex items-center gap-1 text-sm text-zinc-500">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        {court?.address || court?.location || ""}
                    </p>
                </div>
                {court?._id && <Link to={`/courts/${court._id}`} className="shrink-0 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-bold text-emerald-800 transition hover:border-emerald-700 hover:bg-emerald-50">Xem sân</Link>}
            </div>
            {review.comment && <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-700">{review.comment}</p>}
            {review.images?.length > 0 && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {review.images.map(image => <a key={image.publicId || image.imageUrl} href={image.imageUrl} target="_blank" rel="noreferrer" className="aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
                    <img src={image.imageUrl} alt={`Ảnh trải nghiệm tại ${court?.name || "sân pickleball"}`} loading="lazy" className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]" />
                </a>)}
            </div>}
        </div>
    </article>;
}

export default function ReviewCommunity() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [reviews, setReviews] = useState([]);
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 0, totalItems: 0 });
    const [loadedKey, setLoadedKey] = useState("");
    const [error, setError] = useState("");
    const sort = searchParams.get("sort") || "newest";
    const rating = searchParams.get("rating") || "";
    const withPhotos = searchParams.get("withPhotos") === "true";
    const page = Number(searchParams.get("page") || 1);
    const queryKey = JSON.stringify({ sort, rating, withPhotos, page });

    useEffect(() => {
        let active = true;
        reviewService.getCommunityReviews({ sort, rating: rating || undefined, withPhotos: withPhotos ? "true" : undefined, page, limit: 12 })
            .then(result => {
                if (!active) return;
                setError("");
                setReviews(result.reviews || []);
                setPagination(result.pagination || { currentPage: 1, totalPages: 0, totalItems: 0 });
                setLoadedKey(queryKey);
            })
            .catch(err => {
                if (!active) return;
                setError(err.response?.data?.message || "Chưa tải được cộng đồng đánh giá. Vui lòng thử lại.");
                setLoadedKey(queryKey);
            });
        return () => { active = false; };
    }, [sort, rating, withPhotos, page, queryKey]);

    const updateFilter = (key, value) => {
        const next = new URLSearchParams(searchParams);
        if (value) next.set(key, value); else next.delete(key);
        if (key !== "page") next.delete("page");
        setSearchParams(next);
    };
    const loading = loadedKey !== queryKey;

    return <section className="app-shell py-8 sm:py-12">
        <div className="mx-auto max-w-5xl">
            <div className="mb-8 border-b border-zinc-200 pb-7">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-800">Cộng đồng người chơi</p>
                <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">Trải nghiệm sân thật</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">Tham khảo đánh giá từ những người đã hoàn tất lượt chơi, xem ảnh thực tế và chọn sân phù hợp với mình.</p>
                    </div>
                    <Link to="/courts" className="inline-flex items-center gap-2 self-start rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 sm:self-auto">
                        <span className="material-symbols-outlined text-lg">sports_tennis</span>Tìm sân
                    </Link>
                </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3">
                <label className="text-sm font-semibold text-zinc-600" htmlFor="review-sort">Sắp xếp</label>
                <select id="review-sort" value={sort} onChange={event => updateFilter("sort", event.target.value)} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20">
                    <option value="newest">Mới nhất</option><option value="top">Điểm cao trước</option>
                </select>
                <select aria-label="Lọc theo số sao" value={rating} onChange={event => updateFilter("rating", event.target.value)} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20">
                    <option value="">Mọi mức sao</option>{[5, 4, 3, 2, 1].map(star => <option key={star} value={star}>{star} sao</option>)}
                </select>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700">
                    <input type="checkbox" checked={withPhotos} onChange={event => updateFilter("withPhotos", event.target.checked ? "true" : "")} className="rounded border-zinc-400 text-emerald-800 focus:ring-emerald-700" />Có ảnh
                </label>
                <span className="ml-auto text-sm text-zinc-500">{pagination.totalItems} đánh giá</span>
            </div>

            {error && !loading && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
            {loading ? <div className="space-y-4" aria-label="Đang tải đánh giá">{[1, 2, 3].map(item => <div key={item} className="h-52 animate-pulse rounded-2xl bg-zinc-100" />)}</div>
                : reviews.length ? <div className="space-y-4">{reviews.map(review => <ReviewPost key={review._id} review={review} />)}</div>
                    : <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
                        <span className="material-symbols-outlined text-4xl text-zinc-400">rate_review</span>
                        <h2 className="mt-3 font-bold text-zinc-900">Chưa có đánh giá phù hợp</h2>
                        <p className="mt-1 text-sm text-zinc-500">Khi người chơi gửi đánh giá đã được duyệt, bài viết sẽ xuất hiện ở đây.</p>
                        <Link to="/courts" className="mt-4 inline-flex font-bold text-emerald-800 hover:underline">Khám phá sân</Link>
                    </div>}

            {!loading && pagination.totalPages > 1 && <div className="mt-6 flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3">
                <button type="button" disabled={page <= 1} onClick={() => updateFilter("page", String(page - 1))} className="rounded-lg px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40">Trang trước</button>
                <span className="text-sm text-zinc-500">Trang {pagination.currentPage} / {pagination.totalPages}</span>
                <button type="button" disabled={page >= pagination.totalPages} onClick={() => updateFilter("page", String(page + 1))} className="rounded-lg px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40">Trang sau</button>
            </div>}
        </div>
    </section>;
}
