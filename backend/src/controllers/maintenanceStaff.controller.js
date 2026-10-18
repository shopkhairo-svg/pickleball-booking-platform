import maintenanceStaffService from "../services/maintenanceStaff.service.js";

class MaintenanceStaffController {
    async getAssignedMaintenance(req, res) {
        try {
            const records = await maintenanceStaffService.getAssignedMaintenance(req.user.id, req.query);
            return res.status(200).json({ success: true, records });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateProgress(req, res) {
        try {
            const record = await maintenanceStaffService.updateMaintenanceProgress(
                req.user.id,
                req.params.id,
                req.body,
                req.files
            );
            return res.status(200).json({
                success: true,
                message: "Cập nhật tiến độ bảo trì thành công!",
                record
            });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }
}

export default new MaintenanceStaffController();
