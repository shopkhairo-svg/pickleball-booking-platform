import courtInteractionService from "../services/courtInteraction.service.js";

class CourtInteractionController {
    async toggleFavorite(req, res) {
        try {
            const result = await courtInteractionService.toggleFavorite(req.user.id, req.params.courtId);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getFavoriteStatus(req, res) {
        try {
            const result = await courtInteractionService.getFavoriteStatus(req.user.id, req.params.courtId);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getFavorites(req, res) {
        try {
            const result = await courtInteractionService.getFavorites(req.user.id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async recordView(req, res) {
        try {
            const result = await courtInteractionService.recordView({
                userId: req.user?.id,
                guestId: req.body.guestId,
                courtId: req.params.courtId
            });
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getRecentlyViewed(req, res) {
        try {
            const result = await courtInteractionService.getRecentlyViewed({
                userId: req.user?.id,
                guestId: req.query.guestId,
                limit: req.query.limit
            });
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getSimilarCourts(req, res) {
        try {
            const result = await courtInteractionService.getSimilarCourts(req.params.courtId, req.query.limit);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }
}

export default new CourtInteractionController();
