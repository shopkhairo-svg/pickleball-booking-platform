import Delivery from "../models/delivery.model.js";
import ImportOrder from "../models/importOrder.model.js";

class ShipperService {
    async getMyDeliveries(shipperId, status) {
        const filter = { shipperId };

        if (status) {
            if (status === "ACTIVE") {
                filter.status = { $in: ["PENDING", "PICKED_UP"] };
            } else if (status === "HISTORY") {
                filter.status = { $in: ["SHIPPED", "COMPLETED", "CANCELLED"] };
            } else {
                filter.status = status.toUpperCase();
            }
        }

        return await Delivery.find(filter)
            .populate({
                path: "importOrderId",
                populate: [
                    {
                        path: "equipmentId",
                        select: "name type image courtId",
                        populate: {
                            path: "courtId",
                            select: "name location address"
                        }
                    },
                    { path: "vendorId", select: "fullName email phone" },
                    { path: "adminId", select: "fullName email" }
                ]
            })
            .sort({ createdAt: -1 });
    }

    async getDeliveryDetail(shipperId, deliveryId) {
        const delivery = await Delivery.findOne({ _id: deliveryId, shipperId })
            .populate({
                path: "importOrderId",
                populate: [
                    {
                        path: "equipmentId",
                        select: "name type image courtId",
                        populate: {
                            path: "courtId",
                            select: "name location address"
                        }
                    },
                    { path: "vendorId", select: "fullName email phone" },
                    { path: "adminId", select: "fullName email" }
                ]
            });

        if (!delivery) {
            throw new Error("Không tìm thấy vận đơn hoặc bạn không có quyền truy cập vận đơn này!");
        }

        return delivery;
    }

    async updateDeliveryStatus(shipperId, deliveryId, status, file, notes) {
        const delivery = await Delivery.findOne({ _id: deliveryId, shipperId });

        if (!delivery) {
            throw new Error("Không tìm thấy vận đơn hoặc bạn không có quyền xử lý vận đơn này!");
        }

        const upperStatus = status.toUpperCase();

        if (upperStatus === "PICKED_UP") {
            if (delivery.status !== "PENDING") {
                throw new Error("Chỉ có thể lấy hàng khi đơn ở trạng thái PENDING (Chờ lấy hàng)!");
            }
            delivery.status = "PICKED_UP";
            delivery.pickedUpAt = new Date();
        } else if (upperStatus === "SHIPPED") {
            if (delivery.status !== "PICKED_UP") {
                throw new Error("Chỉ có thể báo đã giao khi đơn đang ở trạng thái PICKED_UP (Đang giao)!");
            }
            if (!file) {
                throw new Error("Bạn phải tải lên hình ảnh bằng chứng giao hàng thành công!");
            }
            delivery.status = "SHIPPED";
            delivery.proofImage = file.path; // Multer Cloudinary storage path
            delivery.shippedAt = new Date();
        } else {
            throw new Error(`Trạng thái cập nhật "${status}" không hợp lệ cho Shipper!`);
        }

        if (notes !== undefined) {
            delivery.notes = notes;
        }

        await delivery.save();
        return delivery;
    }
}

export default new ShipperService();
