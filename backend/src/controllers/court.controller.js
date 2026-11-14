// src/controllers/court.controller.js
import courtService from "../services/court.service.js";
import { getLocationSuggestions } from "../services/locationSuggestion.service.js";

class CourtController {
    async getLocations(req, res) {
        try {
            return res.status(200).json({ success: true, ...await getLocationSuggestions(req.query) });
        } catch (error) {
            const status = error.status === 400 ? 400 : 503;
            return res.status(status).json({ success: false, message: status === 400 ? error.message : "Chưa tải được gợi ý địa điểm. Vui lòng thử lại." });
        }
    }

    /**
     * API: GET /api/courts
     */
    async getCourts(req, res) {
        try {
            const result = await courtService.getCourtsListing(req.query);
            return res.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * API: GET /api/courts/:id
     */
    /**
     * API: GET /api/courts/nearby
     * Query params: lat, lng, radius (km), date (optional)
     * Returns courts within the radius and their free slots for the given date.
     */
    async getNearbyCourts(req, res) {
        try {
            const result = await courtService.getNearbyCourts(req.query);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getCourtById(req, res) {
        try {
            const { id } = req.params;
            const { date } = req.query; // 🎯 THÊM DÒNG NÀY: Nhận ngày chọn từ UI gửi lên (Ví dụ: ?date=2026-05-26)

            const court = await courtService.getCourtDetail(id, date); // 🎯 Truyền date vào đây

            return res.status(200).json({
                success: true,
                court
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default new CourtController();
