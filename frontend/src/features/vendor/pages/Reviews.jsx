import { useEffect, useState } from "react";
import { vendorService } from "@/services/vendor.service";

export default function VendorReviews() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        vendorService.getReviews()
            .then(res => {
                if (res.success) {
                    setReviews(res.reviews || []);
                }
            })
            .catch(err => {
                console.error(err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Đánh giá & Phản hồi</h1>
                <p className="text-gray-500 mt-1">Đánh giá và bình luận từ người chơi tại các cụm sân của bạn</p>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
                        <span className="material-symbols-outlined text-4xl mb-2">rate_review</span>
                        <p className="text-lg">Chưa có đánh giá nào từ khách hàng.</p>
                    </div>
                ) : (
                    reviews.map((review) => (
                        <div key={review._id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                        {review.userId?.avatar ? (
                                            <img src={review.userId.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                                        ) : (
                                            review.userId?.fullName?.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{review.userId?.fullName}</h4>
                                        <p className="text-xs text-gray-500">Đánh giá cụm sân: <span className="font-bold text-primary">{review.courtId?.name}</span></p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="flex gap-0.5 justify-end">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <span
                                                key={star}
                                                className={`material-symbols-outlined text-sm ${star <= review.rating ? "text-amber-400 fill" : "text-gray-200"}`}
                                                style={{ fontVariationSettings: star <= review.rating ? "'FILL' 1" : "'FILL' 0" }}
                                            >
                                                star
                                            </span>
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-gray-400">{new Date(review.createdAt).toLocaleDateString("vi-VN")}</span>
                                </div>
                            </div>

                            <p className="text-sm text-gray-700 leading-relaxed pl-13">
                                {review.comment || <em className="text-gray-400">Khách hàng chỉ xếp hạng sao không để lại bình luận.</em>}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
