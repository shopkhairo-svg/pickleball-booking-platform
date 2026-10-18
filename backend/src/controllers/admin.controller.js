// src/controllers/admin.controller.js
import adminService from "../services/admin.service.js";
import { handleError } from "../utils/errorHandler.js";

class AdminController {
    // ======================== COURTS ========================
    async getCourts(req, res) {
        try {
            const result = await adminService.getAllCourts(req.query);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getCourtById(req, res) {
        try {
            const result = await adminService.getCourtDetail(req.params.id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async createCourt(req, res) {
        try {
            const result = await adminService.createCourt(req.body, req.files);
            return res.status(201).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateCourt(req, res) {
        try {
            const result = await adminService.updateCourt(req.params.id, req.body, req.files);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async deleteCourt(req, res) {
        try {
            const result = await adminService.deleteCourt(req.params.id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async blockCourt(req, res) {
        try {
            const result = await adminService.blockCourt(req.params.id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getSubCourts(req, res) {
        try {
            const subCourts = await adminService.getSubCourtsByCourtId(req.params.id);
            return res.status(200).json({ success: true, subCourts });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async deleteCourtImage(req, res) {
        try {
            const { id, publicId } = req.params;
            const result = await adminService.deleteCourtImage(id, publicId);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }


    // ======================== BOOKINGS ========================
    async getAllBookings(req, res) {
        try {
            const result = await adminService.getAllBookings(req.query);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async confirmBooking(req, res) {
        try {
            const result = await adminService.confirmBooking(req.params.id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async cancelBooking(req, res) {
        try {
            const { cancelReason } = req.body;
            const result = await adminService.cancelBooking(req.params.id, cancelReason);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async completeBooking(req, res) {
        try {
            const result = await adminService.completeBooking(req.params.id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    // ======================== EQUIPMENT ========================
    async getAllEquipments(req, res) {
        try {
            const result = await adminService.getAllEquipments(req.query);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async createEquipment(req, res) {
        try {
            const data = { ...req.body };
            if (req.file) {
                data.image = req.file.path;
            }
            const result = await adminService.createEquipment(req.user.id, data);
            return res.status(201).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateEquipment(req, res) {
        try {
            const data = { ...req.body };
            if (req.file) {
                data.image = req.file.path;
            }
            const result = await adminService.updateEquipment(req.params.id, data);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async deleteEquipment(req, res) {
        try {
            const result = await adminService.deleteEquipment(req.params.id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async stockIn(req, res) {
        try {
            const { quantity } = req.body;
            const result = await adminService.stockIn(req.params.id, quantity);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getEquipmentRentals(req, res) {
        try {
            const rentals = await adminService.getEquipmentRentals(req.params.id);
            return res.status(200).json({ success: true, rentals });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    // ======================== IMPORT ORDERS ========================
    async createImportOrder(req, res) {
        try {
            const adminId = req.user.id;
            const result = await adminService.createImportOrder(adminId, req.body);
            return res.status(201).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getImportOrders(req, res) {
        try {
            const result = await adminService.getImportOrders(req.query);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async cancelImportOrder(req, res) {
        try {
            const result = await adminService.cancelImportOrder(req.params.id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    // ======================== MAINTENANCE ========================
    async getAllMaintenance(req, res) {
        try {
            const result = await adminService.getAllMaintenance(req.query);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async createMaintenance(req, res) {
        try {
            const adminId = req.user.id;
            const result = await adminService.createMaintenance(adminId, req.body, req.files);
            return res.status(201).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateMaintenanceStatus(req, res) {
        try {
            const { status } = req.body;
            const result = await adminService.updateMaintenanceStatus(req.params.id, status);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    // ======================== ANALYTICS ========================
    async getDashboardStats(req, res) {
        try {
            const result = await adminService.getDashboardStats();
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getRevenueStats(req, res) {
        try {
            const result = await adminService.getRevenueStats(req.query);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getEquipmentStats(req, res) {
        try {
            const result = await adminService.getEquipmentStats();
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getPeakHours(req, res) {
        try {
            const result = await adminService.getPeakHours();
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    // ======================== USERS ========================
    async getAllUsers(req, res) {
        try {
            const result = await adminService.getAllUsers(req.query);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getUserDetail(req, res) {
        try {
            const result = await adminService.getUserDetail(req.params.id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async toggleUserStatus(req, res) {
        try {
            const result = await adminService.toggleUserStatus(req.params.id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateUserRole(req, res) {
        try {
            const result = await adminService.updateUserRole(req.params.id, req.body);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    // ======================== SETTINGS ========================
    async getSettings(req, res) {
        try {
            const settings = await adminService.getSettings();
            return res.status(200).json({ success: true, settings });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateSettings(req, res) {
        try {
            const settings = await adminService.updateSettings(req.body);
            return res.status(200).json({ success: true, message: "Cập nhật cấu hình thành công!", settings });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async createSubCourt(req, res) {
        try {
            const { name } = req.body;
            const result = await adminService.createSubCourt(req.params.courtId, name);
            return res.status(201).json({ success: true, ...result });
        } catch (error) {
            return handleError(res, error);
        }
    }

    async updateSubCourt(req, res) {
        try {
            const result = await adminService.updateSubCourt(req.params.id, req.body);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return handleError(res, error);
        }
    }

    async deleteSubCourt(req, res) {
        try {
            const result = await adminService.deleteSubCourt(req.params.id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return handleError(res, error);
        }
    }
}

export default new AdminController();
