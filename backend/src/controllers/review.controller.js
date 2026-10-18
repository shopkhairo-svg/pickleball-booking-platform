import reviewService from "../services/review.service.js";

class ReviewController {
    async createReview(req, res) {
        try {
            // Map ảnh từ Multer/Cloudinary sang format {imageUrl, publicId}
            const uploadedImages = (req.files || []).map(f => ({
                imageUrl: f.path,
                publicId: f.filename
            }));
            const result = await reviewService.createReview(req.user.id, {
                ...req.body,
                images: uploadedImages
            });
            return res.status(201).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getCourtReviews(req, res) {
        try {
            const result = await reviewService.getReviewsByCourt(req.params.courtId, req.query);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getEligibility(req, res) {
        try {
            const result = await reviewService.getEligibility(req.user.id, req.params.courtId);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getAdminReviews(req, res) {
        try {
            const result = await reviewService.getAdminReviews(req.query);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getMyBookingReview(req, res) {
        try {
            const result = await reviewService.getMyBookingReview(req.user.id, req.params.bookingId);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateReviewStatus(req, res) {
        try {
            const result = await reviewService.updateReviewStatus(req.params.id, req.body.status);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }
}

export default new ReviewController();
