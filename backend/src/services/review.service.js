import Review from "../models/review.model.js";
import Booking from "../models/booking.model.js";
import Court from "../models/court.model.js";
import notificationService from "./notification.service.js";
import mongoose from "mongoose";


class ReviewService {
    async updateCourtStats(courtId) {
        const stats = await Review.aggregate([
            {
                $match: {
                    courtId: typeof courtId === "string"
                        ? new mongoose.Types.ObjectId(courtId)
                        : courtId,
                    status: "APPROVED"
                }
            },
            {
                $group: {
                    _id: "$courtId",
                    reviewCount: { $sum: 1 },
                    averageRating: { $avg: "$rating" }
                }
            }
        ]);

        const nextStats = stats[0] || { reviewCount: 0, averageRating: 0 };
        await Court.findByIdAndUpdate(courtId, {
            $set: {
                reviewCount: nextStats.reviewCount,
                averageRating: Number((nextStats.averageRating || 0).toFixed(1))
            }
        });
    }

    async getEligibility(userId, courtId) {
        const completedBookings = await Booking.find({
            userId,
            courtId,
            status: "COMPLETED",
            paymentStatus: "PAID"
        }).sort({ bookingDate: -1 });

        const bookingIds = completedBookings.map(booking => booking._id);
        const existingReviews = await Review.find({
            userId,
            courtId,
            bookingId: { $in: bookingIds }
        }).select("bookingId");

        const reviewedBookingIds = new Set(existingReviews.map(review => review.bookingId.toString()));
        const eligibleBookings = completedBookings.filter(booking => !reviewedBookingIds.has(booking._id.toString()));

        return {
            canReview: eligibleBookings.length > 0,
            eligibleBookings
        };
    }

    async createReview(userId, payload) {
        const { courtId, bookingId, rating, comment = "", images = [] } = payload;

        const booking = await Booking.findOne({
            _id: bookingId,
            userId,
            courtId,
            status: "COMPLETED",
            paymentStatus: "PAID"
        });

        if (!booking) {
            throw new Error("Bạn chỉ có thể đánh giá sau khi đã đặt sân, thanh toán và hoàn tất lượt chơi!");
        }

        // ✅ Fix #11: Tạo review với status PENDING, chờ admin duyệt trước khi public
        const review = await Review.create({
            userId,
            courtId,
            bookingId,
            rating,
            comment,
            images,
            status: "PENDING"
        });

        // updateCourtStats chỉ tính review APPROVED → stats vẫn chính xác
        // Pending reviews do not change public rating statistics.

        // ✅ Fix #11: Không cộng điểm ngay — chỉ cộng khi admin APPROVE review
        // Điểm thưởng sẽ được cộng trong updateReviewStatus() khi status chuyển sang APPROVED

        await notificationService.createForUser({
            userId,
            title: "Đánh giá đã được gửi",
            message: `Cảm ơn bạn đã đánh giá sân cho đơn ${booking.bookingCode}. Đánh giá sẽ được hiển thị sau khi quản trị viên xem xét.`,
            type: "REVIEW",
            referenceId: review._id,
            referenceType: "Review"
        }).catch(error => console.error("[Review] Notification:", error.message));

        await notificationService.createForAdmins({
            title: "Có đánh giá sân mới cần duyệt",
            message: `Một khách hàng vừa đánh giá ${rating} sao cho mã booking ${booking.bookingCode}. Vui lòng xem xét và duyệt.`,
            type: "REVIEW",
            referenceId: review._id,
            referenceType: "Review"
        }).catch(error => console.error("[Review] Notification:", error.message));

        return {
            message: "Đánh giá đã được ghi nhận và đang chờ xét duyệt.",
            review
        };
    }

    async getReviewsByCourt(courtId, query = {}) {
        const page = Math.max(1, parseInt(query.page, 10) || 1);
        const limit = Math.max(1, Math.min(parseInt(query.limit, 10) || 10, 50));
        const skip = (page - 1) * limit;

        const filter = {
            courtId,
            status: "APPROVED"
        };

        const [reviews, total] = await Promise.all([
            Review.find(filter)
                .populate("userId", "fullName avatar")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Review.countDocuments(filter)
        ]);

        return {
            reviews,
            pagination: {
                totalItems: total,
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                limit
            }
        };
    }

    async getAdminReviews(query = {}) {
        const filter = {};
        if (query.status) filter.status = query.status.toUpperCase();
        if (query.courtId) filter.courtId = query.courtId;

        const reviews = await Review.find(filter)
            .populate("userId", "fullName email avatar")
            .populate("courtId", "name location")
            .populate("bookingId", "bookingCode status paymentStatus")
            .sort({ createdAt: -1 })
            .limit(100);

        return { reviews };
    }

    async getMyBookingReview(userId, bookingId) {
        const review = await Review.findOne({
            userId,
            bookingId
        });
        return { review: review || null, hasReview: !!review };
    }

    async updateReviewStatus(reviewId, status) {
        const nextStatus = status?.toUpperCase();
        if (!["PENDING", "APPROVED", "HIDDEN", "DELETED"].includes(nextStatus)) {
            throw new Error("Trạng thái đánh giá không hợp lệ!");
        }

        const review = await Review.findById(reviewId);
        if (!review) throw new Error("Đánh giá không tồn tại!");

        review.status = nextStatus;
        await review.save();

        await this.updateCourtStats(review.courtId);

        // ✅ Fix #11: Cộng điểm thưởng khi admin APPROVE review lần đầu tiên (trước đó là PENDING)
        return { message: "Cập nhật trạng thái đánh giá thành công!", review };
    }
}

export default new ReviewService();
