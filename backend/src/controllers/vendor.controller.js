import vendorService from "../services/vendor.service.js";
import { handleError } from "../utils/errorHandler.js";

class VendorController {
    async getStats(req, res) {
        try {
            const stats = await vendorService.getVendorStats(req.user.id);
            return res.status(200).json({ success: true, stats });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getCourts(req, res) {
        try {
            const courts = await vendorService.getVendorCourts(req.user.id);
            return res.status(200).json({ success: true, courts });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async createCourt(req, res) {
        try {
            const court = await vendorService.createVendorCourt(req.user.id, req.body, req.files);
            return res.status(201).json({ success: true, court });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateCourt(req, res) {
        try {
            const court = await vendorService.updateVendorCourt(req.user.id, req.params.id, req.body, req.files);
            return res.status(200).json({ success: true, court });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async deleteCourt(req, res) {
        try {
            await vendorService.deleteVendorCourt(req.user.id, req.params.id);
            return res.status(200).json({ success: true, message: "Đã xóa cụm sân thành công!" });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getEquipments(req, res) {
        try {
            const equipments = await vendorService.getVendorEquipments(req.user.id);
            return res.status(200).json({ success: true, equipments });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async createEquipment(req, res) {
        try {
            const equipment = await vendorService.createVendorEquipment(req.user.id, req.body);
            return res.status(201).json({ success: true, equipment });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateEquipment(req, res) {
        try {
            const equipment = await vendorService.updateVendorEquipment(req.user.id, req.params.id, req.body);
            return res.status(200).json({ success: true, equipment });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async deleteEquipment(req, res) {
        try {
            await vendorService.deleteVendorEquipment(req.user.id, req.params.id);
            return res.status(200).json({ success: true, message: "Đã xóa thiết bị thành công!" });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getEquipmentRentals(req, res) {
        try {
            const rentals = await vendorService.getEquipmentRentals(req.user.id, req.params.id);
            return res.status(200).json({ success: true, rentals });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getBookings(req, res) {
        try {
            const bookings = await vendorService.getVendorBookings(req.user.id, req.query);
            return res.status(200).json({ success: true, bookings });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async prepareBooking(req, res) {
        try {
            const booking = await vendorService.prepareVendorBooking(req.user.id, req.params.id);
            return res.status(200).json({ success: true, message: "Chuẩn bị xong hàng thiết bị thuê!", booking });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async returnEquipment(req, res) {
        try {
            const { items } = req.body;
            const result = await vendorService.returnVendorBookingEquipment(req.user.id, req.params.id, items || []);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getReviews(req, res) {
        try {
            const reviews = await vendorService.getVendorReviews(req.user.id);
            return res.status(200).json({ success: true, reviews });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getImportOrders(req, res) {
        try {
            const orders = await vendorService.getVendorImportOrders(req.user.id);
            return res.status(200).json({ success: true, orders });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async confirmImportOrder(req, res) {
        try {
            const result = await vendorService.confirmImportOrder(req.user.id, req.params.id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async completeImportOrder(req, res) {
        try {
            const result = await vendorService.completeImportOrder(req.user.id, req.params.id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async cancelImportOrder(req, res) {
        try {
            const result = await vendorService.cancelVendorImportOrder(req.user.id, req.params.id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getVendorMaintenance(req, res) {
        try {
            const records = await vendorService.getVendorMaintenance(req.user.id);
            return res.status(200).json({ success: true, records });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateVendorMaintenanceStatus(req, res) {
        try {
            const { status } = req.body;
            const record = await vendorService.updateVendorMaintenanceStatus(req.user.id, req.params.id, status);
            return res.status(200).json({ success: true, message: "Cập nhật trạng thái bảo trì thành công!", record });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getMaintenanceStaff(req, res) {
        try {
            const staff = await vendorService.getMaintenanceStaff(req.query.targetType);
            return res.status(200).json({ success: true, staff });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async assignMaintenanceStaff(req, res) {
        try {
            const { staffId } = req.body;
            const record = await vendorService.assignMaintenanceStaff(req.user.id, req.params.id, staffId);
            return res.status(200).json({ success: true, message: "Phân công thợ bảo trì thành công!", record });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getShippers(req, res) {
        try {
            const shippers = await vendorService.getShippers();
            return res.status(200).json({ success: true, shippers });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async assignShipper(req, res) {
        try {
            const vendorId = req.user.id;
            const orderId = req.params.id;
            const { shipperId } = req.body;
            const delivery = await vendorService.assignShipper(vendorId, orderId, shipperId);
            return res.status(200).json({ success: true, message: "Gán shipper thành công!", delivery });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async confirmDeliveryCompleted(req, res) {
        try {
            const vendorId = req.user.id;
            const deliveryId = req.params.id;
            const result = await vendorService.confirmDeliveryCompleted(vendorId, deliveryId);
            return res.status(200).json({ success: true, message: "Xác nhận hoàn thành giao nhận thành công!", ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getSubCourts(req, res) {
        try {
            const subCourts = await vendorService.getVendorSubCourts(req.user.id, req.params.courtId);
            return res.status(200).json({ success: true, subCourts });
        } catch (error) {
            return handleError(res, error);
        }
    }

    async createSubCourt(req, res) {
        try {
            const { name } = req.body;
            const result = await vendorService.createVendorSubCourt(req.user.id, req.params.courtId, name);
            return res.status(201).json({ success: true, ...result });
        } catch (error) {
            return handleError(res, error);
        }
    }

    async updateSubCourt(req, res) {
        try {
            const result = await vendorService.updateVendorSubCourt(req.user.id, req.params.id, req.body);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return handleError(res, error);
        }
    }

    async deleteSubCourt(req, res) {
        try {
            const result = await vendorService.deleteVendorSubCourt(req.user.id, req.params.id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return handleError(res, error);
        }
    }
}

export default new VendorController();
