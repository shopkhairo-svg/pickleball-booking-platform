import { useEffect, useMemo, useState } from "react";
import { reviewService } from "@/services/review.service";
import { useAuthStore } from "@/store/authStore";

const Stars = ({ value, onChange }) => (
    <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
            <button
                key={star}
                type="button"
                onClick={() => onChange?.(star)}
                className={`material-symbols-outlined text-[24px] ${star <= value ? "text-amber-400" : "text-gray-300"}`}
                style={{ fontVariationSettings: star <= value ? "'FILL' 1" : "'FILL' 0" }}
            >
                star
            </button>
        ))}
    </div>
);

export default function ReviewsSection({ courtId, court }) {
    const { isAuthenticated } = useAuthStore();
    const [reviews, setReviews] = useState([]);
    const [eligibleBookings, setEligibleBookings] = useState([]);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [reviewFiles, setReviewFiles] = useState([]);
    const [bookingId, setBookingId] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    const canReview = useMemo(() => isAuthenticated && eligibleBookings.length > 0, [eligibleBookings, isAuthenticated]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const reviewRes = await reviewService.getCourtReviews(courtId);
            if (reviewRes.success) setReviews(reviewRes.reviews || []);

            if (isAuthenticated) {
                const eligibilityRes = await reviewService.getEligibility(courtId);
                if (eligibilityRes.success) {
                    setEligibleBookings(eligibilityRes.eligibleBookings || []);
                    setBookingId(eligibilityRes.eligibleBookings?.[0]?._id || "");
                }
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (courtId) fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courtId, isAuthenticated]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setMessage("");
        try {
            const formData = new FormData();
            formData.append("courtId", courtId);
            formData.append("bookingId", bookingId);
            formData.append("rating", rating);
            formData.append("comment", comment);
            reviewFiles.forEach(file => formData.append("images", file));

            const res = await reviewService.createReview(formData);
            if (res.success) {
                setComment("");
                setReviewFiles([]);
                setMessage(res.message || "Đánh giá thành công!");
                await fetchData();
            }
        } catch (error) {
            setMessage(error.response?.data?.message || "Không thể gửi đánh giá!");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-black text-on-surface">Đánh giá từ người chơi</h2>
                    <p className="text-sm text-on-surface-variant mt-1">
                        {court?.averageRating || 0}/5 sao từ {court?.reviewCount || 0} đánh giá đã xác thực
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                        <span
                            key={star}
                            className={`material-symbols-outlined text-[22px] ${star <= Math.round(court?.averageRating || 0) ? "text-amber-400" : "text-gray-300"}`}
                            style={{ fontVariationSettings: star <= Math.round(court?.averageRating || 0) ? "'FILL' 1" : "'FILL' 0" }}
                        >
                            star
                        </span>
                    ))}
                </div>
            </div>

            {canReview && (
                <form onSubmit={handleSubmit} className="surface-panel-flat space-y-4 p-5">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="md:w-64">
                            <label className="text-sm font-bold text-on-surface">Booking đã hoàn tất</label>
                            <select
                                value={bookingId}
                                onChange={(event) => setBookingId(event.target.value)}
                                className="field-control mt-2 px-3 py-2"
                            >
                                {eligibleBookings.map(booking => (
                                    <option key={booking._id} value={booking._id}>
                                        {booking.bookingCode} - {booking.bookingDate}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="text-sm font-bold text-on-surface">Số sao</label>
                            <div className="mt-2"><Stars value={rating} onChange={setRating} /></div>
                        </div>
                    </div>
                    <textarea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        rows={3}
                        placeholder="Chia sẻ trải nghiệm thực tế của bạn về sân này..."
                        className="field-control"
                    />
                    <div>
                        <label className="text-sm font-bold text-on-surface">Ảnh trải nghiệm</label>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(event) => setReviewFiles(Array.from(event.target.files || []).slice(0, 5))}
                            className="mt-2 w-full text-sm text-on-surface-variant file:mr-4 file:rounded-xl file:border-0 file:bg-primary-container file:px-4 file:py-2 file:text-sm file:font-bold file:text-primary hover:file:bg-primary/15"
                        />
                        {reviewFiles.length > 0 && (
                            <p className="mt-1 text-xs text-on-surface-variant">
                                Đã chọn {reviewFiles.length}/5 ảnh.
                            </p>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-primary">{message}</p>
                        <button
                            type="submit"
                            disabled={submitting || !bookingId}
                            className="btn-primary px-5 py-2.5"
                        >
                            {submitting ? "Đang gửi..." : "Gửi đánh giá"}
                        </button>
                    </div>
                </form>
            )}

            {!loading && reviews.length === 0 && (
                <div className="surface-panel-flat p-6 text-sm text-on-surface-variant">
                    Chưa có đánh giá nào cho sân này.
                </div>
            )}

            <div className="space-y-3">
                {reviews.map(review => (
                    <article key={review._id} className="surface-panel-flat p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <img
                                    src={review.userId?.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=pickle"}
                                    alt={review.userId?.fullName || "User"}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                <div>
                                    <p className="font-bold text-sm text-on-surface">{review.userId?.fullName || "Người chơi"}</p>
                                    <p className="text-xs text-outline">{new Date(review.createdAt).toLocaleDateString("vi-VN")}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <span
                                        key={star}
                                        className={`material-symbols-outlined text-[17px] ${star <= review.rating ? "text-amber-400" : "text-gray-300"}`}
                                        style={{ fontVariationSettings: star <= review.rating ? "'FILL' 1" : "'FILL' 0" }}
                                    >
                                        star
                                    </span>
                                ))}
                            </div>
                        </div>
                        {review.comment && <p className="mt-3 text-sm leading-6 text-on-surface-variant">{review.comment}</p>}
                        {review.images?.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {review.images.map((image) => (
                                    <a
                                        key={image.publicId || image.imageUrl}
                                        href={image.imageUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block h-20 w-20 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low"
                                    >
                                        <img src={image.imageUrl} alt="" className="h-full w-full object-cover" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </article>
                ))}
            </div>
        </section>
    );
}
