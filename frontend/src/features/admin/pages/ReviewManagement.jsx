import { useEffect, useMemo, useState } from "react";
import { reviewService } from "../../../services/review.service";

const statusLabels = {
    PENDING: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    HIDDEN: "Đã ẩn",
    DELETED: "Đã xóa",
};

const statusStyles = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    APPROVED: "bg-green-50 text-green-700 border-green-200",
    HIDDEN: "bg-gray-100 text-gray-600 border-gray-200",
    DELETED: "bg-red-50 text-red-600 border-red-200",
};

const tabs = [
    { value: "", label: "Tất cả" },
    { value: "PENDING", label: "Chờ duyệt" },
    { value: "APPROVED", label: "Đã duyệt" },
    { value: "HIDDEN", label: "Đã ẩn" },
];

const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const RatingStars = ({ rating }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
            <span
                key={star}
                className={`material-symbols-outlined text-[18px] ${star <= rating ? "text-amber-400" : "text-gray-200"}`}
                style={{ fontVariationSettings: star <= rating ? "'FILL' 1" : "'FILL' 0" }}
            >
                star
            </span>
        ))}
    </div>
);

export default function ReviewManagement() {
    const [reviews, setReviews] = useState([]);
    const [activeStatus, setActiveStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [error, setError] = useState("");

    const fetchReviews = async () => {
        try {
            await Promise.resolve();
            setLoading(true);
            setError("");
            const res = await reviewService.getAdminReviews();
            setReviews(res.reviews || []);
        } catch (err) {
            setError(err?.response?.data?.message || err.message || "Không thể tải danh sách đánh giá.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = window.setTimeout(() => {
            fetchReviews();
        }, 0);
        return () => window.clearTimeout(timer);
    }, []);

    const counts = useMemo(() => {
        return reviews.reduce(
            (acc, review) => {
                acc.total += 1;
                acc[review.status] = (acc[review.status] || 0) + 1;
                return acc;
            },
            { total: 0, PENDING: 0, APPROVED: 0, HIDDEN: 0 }
        );
    }, [reviews]);

    const visibleReviews = useMemo(() => {
        if (!activeStatus) return reviews;
        return reviews.filter((review) => review.status === activeStatus);
    }, [activeStatus, reviews]);

    const handleStatusChange = async (reviewId, status) => {
        const actionLabel = status === "APPROVED" ? "duyệt" : "ẩn";
        if (!window.confirm(`Bạn có chắc muốn ${actionLabel} đánh giá này?`)) return;

        try {
            setUpdatingId(reviewId);
            await reviewService.updateReviewStatus(reviewId, status);
            await fetchReviews();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Cập nhật trạng thái đánh giá thất bại!");
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Duyệt đánh giá</h1>
                    <p className="mt-1 text-gray-500">Kiểm duyệt phản hồi khách hàng trước khi hiển thị công khai</p>
                </div>
                <button
                    type="button"
                    onClick={fetchReviews}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
                >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                    Làm mới
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                    <p className="text-xs font-bold uppercase text-amber-700">Chờ duyệt</p>
                    <p className="mt-2 text-2xl font-black text-amber-800">{counts.PENDING}</p>
                </div>
                <div className="rounded-2xl border border-green-100 bg-green-50/70 p-4">
                    <p className="text-xs font-bold uppercase text-green-700">Đã duyệt</p>
                    <p className="mt-2 text-2xl font-black text-green-800">{counts.APPROVED}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-bold uppercase text-gray-500">Đã ẩn</p>
                    <p className="mt-2 text-2xl font-black text-gray-800">{counts.HIDDEN}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex flex-wrap gap-2 border-b border-gray-100 p-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.value || "all"}
                            type="button"
                            onClick={() => setActiveStatus(tab.value)}
                            className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                                activeStatus === tab.value
                                    ? "bg-primary text-white"
                                    : "bg-gray-50 text-gray-600 hover:bg-primary/10 hover:text-primary"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex h-56 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-red-500">{error}</div>
                ) : visibleReviews.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <span className="material-symbols-outlined mb-2 text-5xl">rate_review</span>
                        <p className="text-lg font-semibold">Không có đánh giá nào trong bộ lọc này.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {visibleReviews.map((review) => (
                            <article key={review._id} className="p-5">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0 flex-1 space-y-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-black text-primary">
                                                {review.userId?.avatar ? (
                                                    <img src={review.userId.avatar} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    review.userId?.fullName?.charAt(0)?.toUpperCase() || "U"
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{review.userId?.fullName || "Người dùng"}</p>
                                                <p className="text-xs text-gray-500">{review.userId?.email || "Không có email"}</p>
                                            </div>
                                            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[review.status] || statusStyles.HIDDEN}`}>
                                                {statusLabels[review.status] || review.status}
                                            </span>
                                        </div>

                                        <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-3">
                                            <div className="rounded-xl bg-gray-50 p-3">
                                                <p className="text-xs font-bold text-gray-400">Cụm sân</p>
                                                <p className="mt-1 font-semibold text-gray-800">{review.courtId?.name || "Sân đã xóa"}</p>
                                            </div>
                                            <div className="rounded-xl bg-gray-50 p-3">
                                                <p className="text-xs font-bold text-gray-400">Booking</p>
                                                <p className="mt-1 font-semibold text-gray-800">{review.bookingId?.bookingCode || "-"}</p>
                                            </div>
                                            <div className="rounded-xl bg-gray-50 p-3">
                                                <p className="text-xs font-bold text-gray-400">Ngày gửi</p>
                                                <p className="mt-1 font-semibold text-gray-800">{formatDate(review.createdAt)}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <RatingStars rating={review.rating} />
                                            <p className="text-sm leading-relaxed text-gray-700">
                                                {review.comment || <em className="text-gray-400">Khách hàng chỉ đánh giá sao, không để lại bình luận.</em>}
                                            </p>
                                        </div>

                                        {review.images?.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {review.images.map((image) => (
                                                    <a
                                                        key={image.publicId || image.imageUrl}
                                                        href={image.imageUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="block h-20 w-20 overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
                                                    >
                                                        <img src={image.imageUrl} alt="" className="h-full w-full object-cover" />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex shrink-0 gap-2 lg:flex-col">
                                        {review.status !== "APPROVED" && (
                                            <button
                                                type="button"
                                                disabled={updatingId === review._id}
                                                onClick={() => handleStatusChange(review._id, "APPROVED")}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
                                            >
                                                <span className="material-symbols-outlined text-[17px]">check_circle</span>
                                                Duyệt
                                            </button>
                                        )}
                                        {review.status !== "HIDDEN" && (
                                            <button
                                                type="button"
                                                disabled={updatingId === review._id}
                                                onClick={() => handleStatusChange(review._id, "HIDDEN")}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                <span className="material-symbols-outlined text-[17px]">visibility_off</span>
                                                Ẩn
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
