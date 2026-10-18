// src/repositories/equipment.repository.js (MÔI TRƯỜNG BACKEND)
import Equipment from "../models/equipment.model.js";

class EquipmentRepository {
    /**
     * ✅ Fix #10: Lấy thiết bị AVAILABLE, lọc theo courtId nếu có
     * Tránh user đặt sân ở HN nhưng hiển thị thiết bị của sân ở HCM
     */
    async findAvailableEquipments(courtId = null) {
        const filter = {
            status: "AVAILABLE",
            $expr: {
                $gt: [
                    { $subtract: ["$availableQuantity", { $ifNull: ["$maintenanceQuantity", 0] }] },
                    0
                ]
            }
        };
        if (courtId) {
            // Lấy thiết bị thuộc court cụ thể HOẶC thiết bị global (courtId = null)
            filter.$or = [
                { courtId: courtId },
                { courtId: null }
            ];
        }
        return await Equipment.find(filter);
    }

    /**
     * Tìm kiếm một thiết bị cụ thể theo ID để check kho và tính giá
     */
    async findById(id) {
        return await Equipment.findById(id);
    }
}

export default new EquipmentRepository();