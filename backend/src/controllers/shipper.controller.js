import shipperService from "../services/shipper.service.js";

class ShipperController {
    async getMyDeliveries(req, res) {
        try {
            const shipperId = req.user.id;
            const { status } = req.query;
            const deliveries = await shipperService.getMyDeliveries(shipperId, status);
            return res.status(200).json({ success: true, deliveries });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getDeliveryDetail(req, res) {
        try {
            const shipperId = req.user.id;
            const deliveryId = req.params.id;
            const delivery = await shipperService.getDeliveryDetail(shipperId, deliveryId);
            return res.status(200).json({ success: true, delivery });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateDeliveryStatus(req, res) {
        try {
            const shipperId = req.user.id;
            const deliveryId = req.params.id;
            const { status, notes } = req.body;
            const file = req.file; // From multer upload
            const delivery = await shipperService.updateDeliveryStatus(shipperId, deliveryId, status, file, notes);
            return res.status(200).json({ success: true, message: "Cập nhật trạng thái vận đơn thành công!", delivery });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }
}

export default new ShipperController();
