import Court from "../models/court.model.js";
import Equipment from "../models/equipment.model.js";
import Maintenance from "../models/maintenance.model.js";
import notificationService from "./notification.service.js";

class MaintenanceStaffService {
    mapFiles(files = []) {
        return files.map(file => ({
            imageUrl: file.path,
            publicId: file.filename
        }));
    }

    async getAssignedMaintenance(staffId, query = {}) {
        const filter = { assignedStaffId: staffId };
        if (query.status) filter.status = query.status.toUpperCase();

        const records = await Maintenance.find(filter)
            .populate("createdBy", "fullName email")
            .populate("assignedVendorId", "fullName email phone")
            .sort({ createdAt: -1 });

        const courtIds = records.filter(r => r.targetType === "COURT").map(r => r.targetId);
        const equipmentIds = records.filter(r => r.targetType === "EQUIPMENT").map(r => r.targetId);

        const [courts, equipments] = await Promise.all([
            Court.find({ _id: { $in: courtIds } }).select("name location address"),
            Equipment.find({ _id: { $in: equipmentIds } }).select("name type")
        ]);

        const courtMap = new Map(courts.map(court => [court._id.toString(), court]));
        const equipmentMap = new Map(equipments.map(equipment => [equipment._id.toString(), equipment]));

        return records.map(record => {
            const data = record.toObject();
            if (record.targetType === "COURT") {
                const court = courtMap.get(record.targetId.toString());
                data.targetName = court ? court.name : "Sân đã xóa";
                data.targetLocation = court ? court.location : "";
                data.targetAddress = court ? court.address : "";
            } else {
                const equipment = equipmentMap.get(record.targetId.toString());
                data.targetName = equipment ? equipment.name : "Thiết bị đã xóa";
                data.targetEquipmentType = equipment ? equipment.type : "";
            }
            return data;
        });
    }

    async updateMaintenanceProgress(staffId, maintenanceId, data, files = []) {
        const record = await Maintenance.findOne({ _id: maintenanceId, assignedStaffId: staffId });
        if (!record) {
            throw new Error("Yêu cầu bảo trì không tồn tại hoặc không được phân công cho bạn!");
        }
        if (record.status === "COMPLETED") {
            throw new Error("Yêu cầu đã được chủ sở hữu xác nhận hoàn tất!");
        }

        const status = data.status?.toUpperCase();
        const validStatuses = ["IN_PROGRESS", "PENDING_CONFIRMATION"];
        if (!validStatuses.includes(status)) {
            throw new Error("Thợ bảo trì chỉ được cập nhật Đang xử lý hoặc Chờ chủ sân xác nhận!");
        }

        record.status = status;
        if (status === "IN_PROGRESS" && !record.maintenanceDate) {
            record.maintenanceDate = new Date();
        }

        record.workLogs.push({
            status,
            note: data.note?.trim() || "",
            images: this.mapFiles(files),
            updatedBy: staffId
        });

        await record.save();

        if (status === "PENDING_CONFIRMATION" && record.assignedVendorId) {
            await notificationService.createForUser({
                userId: record.assignedVendorId,
                title: "Yêu cầu bảo trì chờ xác nhận",
                message: `Thợ bảo trì đã báo hoàn tất yêu cầu "${record.title}". Vui lòng kiểm tra và xác nhận.`,
                type: "SYSTEM",
                referenceId: record._id,
                referenceType: "Maintenance"
            });
        }

        return await Maintenance.findById(record._id)
            .populate("createdBy", "fullName email")
            .populate("assignedVendorId", "fullName email phone");
    }
}

export default new MaintenanceStaffService();
