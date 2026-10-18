import pointsService from "../services/points.service.js";

class PointsController {
    async getWallet(req, res) {
        try {
            const result = await pointsService.getWallet(req.user.id);
            const transactions = await pointsService.getTransactions(req.user.id, req.query.limit);
            return res.status(200).json({ success: true, ...result, transactions });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }
}

export default new PointsController();
