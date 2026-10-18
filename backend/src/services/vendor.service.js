import mongoose from "mongoose";
import Court from "../models/court.model.js";
import Equipment from "../models/equipment.model.js";
import Booking from "../models/booking.model.js";
import Review from "../models/review.model.js";
import SubCourt from "../models/subCourt.model.js";
import CourtSlot from "../models/courtSlot.model.js";
import BookingEquipment from "../models/bookingEquipment.model.js";
import notificationService from "./notification.service.js";
import ImportOrder from "../models/importOrder.model.js";
import Maintenance from "../models/maintenance.model.js";
import User from "../models/user.model.js";
import Delivery from "../models/delivery.model.js";
import { generateSlotsForNewSubCourt } from "../utils/slotScheduler.js";
import bookingService from "./booking.service.js";


class VendorService {
    // 1. Thống kê Vendor Dashboard
    async getVendorStats(vendorId) {
        // Xác định vendorType để trả đúng loại thống kê
        const vendor = await User.findById(vendorId).select("vendorType");
        const vendorType = vendor?.vendorType || "EQUIPMENT";

        if (vendorType === "COURT") {
            return this._getCourtVendorStats(vendorId);
        } else {
            return this._getEquipmentVendorStats(vendorId);
        }
    }

    // 1a. Thống kê cho chủ sân (COURT vendor)
    async _getCourtVendorStats(vendorId) {
        // Lấy danh sách sân của vendor này
        const courts = await Court.find({ vendorId }).select("_id");
        const courtIds = courts.map(c => c._id);

        if (courtIds.length === 0) {
            return {
                vendorType: "COURT",
                totalCourts: 0,
                totalSubCourts: 0,
                totalBookings: 0,
                pendingBookings: 0,
                confirmedBookings: 0,
                completedBookings: 0,
                cancelledBookings: 0,
                totalRevenue: 0,
                averageRating: 0,
                totalReviews: 0,
                monthlyRevenue: []
            };
        }

        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);
        const endOfYear = new Date(`${currentYear}-12-31T23:59:59.999Z`);

        const [
            totalSubCourts,
            totalBookings,
            pendingBookings,
            confirmedBookings,
            completedBookings,
            cancelledBookings,
            revenueResult,
            reviewResult,
            monthlyRevenueRaw
        ] = await Promise.all([
            SubCourt.countDocuments({ courtId: { $in: courtIds } }),
            Booking.countDocuments({ courtId: { $in: courtIds } }),
            Booking.countDocuments({ courtId: { $in: courtIds }, status: "PENDING" }),
            Booking.countDocuments({ courtId: { $in: courtIds }, status: "CONFIRMED" }),
            Booking.countDocuments({ courtId: { $in: courtIds }, status: "COMPLETED" }),
            Booking.countDocuments({ courtId: { $in: courtIds }, status: "CANCELLED" }),
            Booking.aggregate([
                { $match: { courtId: { $in: courtIds }, status: "COMPLETED", paymentStatus: "PAID" } },
                { $group: { _id: null, total: { $sum: "$totalPrice" } } }
            ]),
            Review.aggregate([
                { $match: { courtId: { $in: courtIds } } },
                { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } }
            ]),
            Booking.aggregate([
                {
                    $match: {
                        courtId: { $in: courtIds },
                        status: "COMPLETED",
                        paymentStatus: "PAID",
                        createdAt: { $gte: startOfYear, $lte: endOfYear }
                    }
                },
                {
                    $group: {
                        _id: { $substr: ["$createdAt", 5, 2] },
                        revenue: { $sum: "$totalPrice" },
                        bookings: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        return {
            vendorType: "COURT",
            totalCourts: courtIds.length,
            totalSubCourts,
            totalBookings,
            pendingBookings,
            confirmedBookings,
            completedBookings,
            cancelledBookings,
            totalRevenue: revenueResult[0]?.total || 0,
            averageRating: reviewResult[0]?.avgRating ? Math.round(reviewResult[0].avgRating * 10) / 10 : 0,
            totalReviews: reviewResult[0]?.count || 0,
            monthlyRevenue: monthlyRevenueRaw.map(item => ({
                month: `Tháng ${item._id}`,
                revenue: item.revenue,
                bookings: item.bookings
            }))
        };
    }

    // 1b. Thống kê cho nhà cung cấp thiết bị (EQUIPMENT vendor)
    async _getEquipmentVendorStats(vendorId) {
        const [totalOrders, pendingOrdersCount, confirmedOrdersCount, completedOrdersCount, totalSuppliedResult] = await Promise.all([
            ImportOrder.countDocuments({ vendorId }),
            ImportOrder.countDocuments({ vendorId, status: "PENDING" }),
            ImportOrder.countDocuments({ vendorId, status: "CONFIRMED" }),
            ImportOrder.countDocuments({ vendorId, status: "COMPLETED" }),
            ImportOrder.aggregate([
                { $match: { vendorId: new mongoose.Types.ObjectId(vendorId), status: "COMPLETED" } },
                { $group: { _id: null, total: { $sum: "$quantity" } } }
            ])
        ]);

        const totalSuppliedQuantity = totalSuppliedResult[0]?.total || 0;

        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);
        const endOfYear = new Date(`${currentYear}-12-31T23:59:59.999Z`);

        // ✅ Fix Section 11: Tính doanh thu tiền thật = quantity × unitPrice (nếu có trường unitPrice)
        // Nếu ImportOrder chưa có unitPrice, fallback về 0 để không break
        const monthlyRevenue = await ImportOrder.aggregate([
            {
                $match: {
                    vendorId: new mongoose.Types.ObjectId(vendorId),
                    status: "COMPLETED",
                    createdAt: { $gte: startOfYear, $lte: endOfYear }
                }
            },
            {
                $group: {
                    _id: { $substr: ["$createdAt", 5, 2] },
                    suppliedQuantity: { $sum: "$quantity" },                          // Số lượng hàng đã cung cấp
                    revenue: { $sum: { $multiply: ["$quantity", { $ifNull: ["$unitPrice", 0] }] } }, // Doanh thu tiền thật
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return {
            vendorType: "EQUIPMENT",
            totalOrders,
            pendingOrdersCount,
            confirmedOrdersCount,
            completedOrdersCount,
            totalSuppliedQuantity,
            monthlyRevenue: monthlyRevenue.map(item => ({
                month: `Tháng ${item._id}`,
                suppliedQuantity: item.suppliedQuantity, // Số lượng sản phẩm cung cấp (để biểu đồ số lượng)
                revenue: item.revenue,                   // ✅ Doanh thu tiền thật (VND)
                orders: item.orders                      // Số đơn nhập kho
            }))
        };
    }

    // 2. Quản lý Sân (Vendor Courts)
    async getVendorCourts(vendorId) {
        const courts = await Court.find({ vendorId });
        const result = [];
        for (const court of courts) {
            const subCourts = await SubCourt.find({ courtId: court._id });
            result.push({
                ...court.toObject(),
                subCourtsCount: subCourts.length
            });
        }
        return result;
    }

    async createVendorCourt(vendorId, courtData, files) {
        const { name, location, address, type, description, pricePerHour, openTime, closeTime, slotDuration, amenities } = courtData;

        const vendor = await User.findOne({
            _id: vendorId,
            role: "VENDOR",
            vendorType: "COURT",
            status: "ACTIVE"
        });
        if (!vendor) {
            throw new Error("Chỉ chủ sân đang hoạt động mới được tạo cụm sân!");
        }

        const existingCourt = await Court.findOne({ vendorId }).select("name");
        if (existingCourt) {
            throw new Error(`Bạn đã sở hữu sân "${existingCourt.name}". Mỗi chủ sân chỉ được quản lý 1 cụm sân!`);
        }

        if (!name || !location || !type || !pricePerHour) {
            throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc!");
        }

        const images = files && files.length > 0
            ? files.map(file => ({ imageUrl: file.path, publicId: file.filename }))
            : [];

        const parsedAmenities = amenities
            ? (typeof amenities === "string" ? amenities.split(",").map(a => a.trim()) : amenities)
            : [];

        const court = await Court.create({
            name: name.trim(),
            location: location.trim(),
            address: address?.trim() || "",
            type: type.toUpperCase(),
            description: description?.trim() || "",
            pricePerHour: parseInt(pricePerHour),
            openTime: openTime || "06:00",
            closeTime: closeTime || "22:00",
            slotDuration: parseInt(slotDuration) || 60,
            amenities: parsedAmenities,
            images,
            status: "AVAILABLE",
            vendorId
        });

        // Tạo mặc định 2 sân nhỏ (SubCourts) để dùng luôn
        const sub1 = await SubCourt.create({ courtId: court._id, name: "Sân nhỏ số 1 (VIP)", status: "AVAILABLE" });
        const sub2 = await SubCourt.create({ courtId: court._id, name: "Sân nhỏ số 2 (Standard)", status: "AVAILABLE" });

        // Tự động sinh slot 7 ngày trống
        const datesToSeed = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            datesToSeed.push(d.toLocaleDateString("sv-SE"));
        }

        const startH = parseInt(court.openTime.split(":")[0]) || 6;
        const endH = parseInt(court.closeTime.split(":")[0]) || 22;

        const slots = [];
        for (const dateStr of datesToSeed) {
            for (const sub of [sub1, sub2]) {
                // ✅ Fix #8: Dùng slotDuration thật thay vì hardcode 60 phút
                const slotDurationMin = court.slotDuration || 60;
                let currentHour = startH;
                let currentMin = 0;

                while (true) {
                    const totalMinStart = currentHour * 60 + currentMin;
                    const totalMinEnd = totalMinStart + slotDurationMin;
                    const endHour = Math.floor(totalMinEnd / 60);
                    const endMin = totalMinEnd % 60;

                    // Dừng nếu giờ kết thúc vượt quá giờ đóng cửa
                    if (endHour > endH || (endHour === endH && endMin > 0)) break;

                    const startStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
                    const endStr = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

                    slots.push({
                        subCourtId: sub._id,
                        courtId: court._id,
                        date: dateStr,
                        startTime: startStr,
                        endTime: endStr,
                        isBooked: false
                    });

                    // Tăng theo đúng slotDuration
                    const nextMin = totalMinStart + slotDurationMin;
                    currentHour = Math.floor(nextMin / 60);
                    currentMin = nextMin % 60;
                }
            }
        }
        await CourtSlot.insertMany(slots);

        return court;
    }

    async updateVendorCourt(vendorId, courtId, courtData, files) {
        const court = await Court.findOne({ _id: courtId, vendorId });
        if (!court) throw new Error("Cụm sân không tồn tại hoặc không thuộc quyền quản lý của bạn!");

        const updateData = {};
        if (courtData.name) updateData.name = courtData.name.trim();
        if (courtData.location) updateData.location = courtData.location.trim();
        if (courtData.address !== undefined) updateData.address = courtData.address.trim();
        if (courtData.type) updateData.type = courtData.type.toUpperCase();
        if (courtData.description !== undefined) updateData.description = courtData.description.trim();
        if (courtData.pricePerHour) updateData.pricePerHour = parseInt(courtData.pricePerHour);
        if (courtData.openTime) updateData.openTime = courtData.openTime;
        if (courtData.closeTime) updateData.closeTime = courtData.closeTime;
        if (courtData.slotDuration) updateData.slotDuration = parseInt(courtData.slotDuration);
        if (courtData.status) updateData.status = courtData.status.toUpperCase();

        if (courtData.amenities) {
            updateData.amenities = typeof courtData.amenities === "string"
                ? courtData.amenities.split(",").map(a => a.trim())
                : courtData.amenities;
        }

        if (files && files.length > 0) {
            const newImages = files.map(file => ({ imageUrl: file.path, publicId: file.filename }));
            updateData.images = [...court.images, ...newImages];
        }

        const updated = await Court.findByIdAndUpdate(courtId, { $set: updateData }, { new: true });
        if (updateData.status === "AVAILABLE") {
            const subCourts = await SubCourt.find({ courtId, status: "AVAILABLE" });
            for (const sub of subCourts) {
                await generateSlotsForNewSubCourt(courtId, sub);
            }
        }
        return updated;
    }

    async deleteVendorCourt(vendorId, courtId) {
        const court = await Court.findOne({ _id: courtId, vendorId });
        if (!court) throw new Error("Cụm sân không tồn tại hoặc không thuộc quyền quản lý của bạn!");

        // Soft delete (Ẩn sân)
        return await Court.findByIdAndUpdate(courtId, { $set: { status: "HIDDEN" } }, { new: true });
    }

    // 3. Quản lý Thiết bị (Vendor Equipments)
    async getVendorEquipments(vendorId) {
        return await Equipment.find({ vendorId });
    }

    async createVendorEquipment(vendorId, data) {
        const { name, type, description, quantity, rentalType, rentalPrice, image, courtId } = data;

        if (!name || !type || !quantity || !rentalType || !rentalPrice) {
            throw new Error("Vui lòng nhập đầy đủ thông tin thiết bị!");
        }

        return await Equipment.create({
            name: name.trim(),
            type: type.toUpperCase(),
            description: description?.trim() || "",
            quantity: parseInt(quantity),
            availableQuantity: parseInt(quantity),
            rentalType: rentalType.toUpperCase(),
            rentalPrice: parseInt(rentalPrice),
            image: image || "",
            status: "AVAILABLE",
            vendorId,
            courtId: courtId || null
        });
    }

    async updateVendorEquipment(vendorId, equipmentId, data) {
        const equipment = await Equipment.findOne({ _id: equipmentId, vendorId });
        if (!equipment) throw new Error("Thiết bị không tồn tại hoặc không thuộc quyền của bạn!");

        const updateData = {};
        if (data.name) updateData.name = data.name.trim();
        if (data.type) updateData.type = data.type.toUpperCase();
        if (data.description !== undefined) updateData.description = data.description.trim();
        if (data.rentalType) updateData.rentalType = data.rentalType.toUpperCase();
        if (data.rentalPrice) updateData.rentalPrice = parseInt(data.rentalPrice);
        if (data.image !== undefined) updateData.image = data.image;
        if (data.status) updateData.status = data.status.toUpperCase();
        if (data.quantity !== undefined) {
            const diff = parseInt(data.quantity) - equipment.quantity;
            updateData.quantity = parseInt(data.quantity);
            updateData.availableQuantity = Math.max(0, equipment.availableQuantity + diff);
        }
        if (data.courtId !== undefined) updateData.courtId = data.courtId || null;

        return await Equipment.findByIdAndUpdate(equipmentId, { $set: updateData }, { new: true });
    }

    async deleteVendorEquipment(vendorId, equipmentId) {
        const equipment = await Equipment.findOne({ _id: equipmentId, vendorId });
        if (!equipment) throw new Error("Thiết bị không tồn tại hoặc không thuộc quyền của bạn!");

        const activeRentals = await BookingEquipment.countDocuments({
            equipmentId,
            returnStatus: "RENTING"
        });
        if (activeRentals > 0) {
            throw new Error("Không thể xóa thiết bị đang có người thuê!");
        }

        await Equipment.findByIdAndDelete(equipmentId);
        return true;
    }

    // 4. Quản lý Đơn hàng (Vendor Bookings)
    async getVendorBookings(vendorId, query) {
        await bookingService.autoCompletePastBookings();
        const courts = await Court.find({ vendorId });
        const courtIds = courts.map(c => c._id);

        const filter = { courtId: { $in: courtIds } };
        if (query.status) filter.status = query.status.toUpperCase();

        const bookings = await Booking.find(filter)
            .populate("userId", "fullName email phone avatar")
            .populate("courtId", "name location address")
            .sort({ createdAt: -1 });

        // Lấy thêm các thiết bị thuê kèm cho từng đơn hàng
        const result = [];
        for (const booking of bookings) {
            const equipments = await BookingEquipment.find({ bookingId: booking._id })
                .populate("equipmentId", "name type image");
            result.push({
                ...booking.toObject(),
                rentedEquipments: equipments
            });
        }
        return result;
    }

    async prepareVendorBooking(vendorId, bookingId) {
        const booking = await Booking.findById(bookingId).populate("courtId");
        if (!booking) throw new Error("Đơn hàng không tồn tại!");

        if (booking.courtId.vendorId.toString() !== vendorId.toString()) {
            throw new Error("Bạn không có quyền quản lý đơn hàng này!");
        }

        booking.isPrepared = true;
        await booking.save();

        // Tạo thông báo cho User là hàng đã chuẩn bị xong
        await notificationService.createForUser({
            userId: booking.userId,
            title: "Đơn hàng đã được chuẩn bị xong",
            message: `Thiết bị thuê trong mã đặt sân ${booking.bookingCode} đã được chuẩn bị xong và sẵn sàng bàn giao!`,
            type: "BOOKING",
            referenceId: booking._id,
            referenceType: "Booking"
        });



        return booking;
    }

    async returnVendorBookingEquipment(vendorId, bookingId, items) {
        const booking = await Booking.findById(bookingId).populate("courtId");
        if (!booking) throw new Error("Đơn hàng không tồn tại!");

        if (booking.courtId.vendorId.toString() !== vendorId.toString()) {
            throw new Error("Bạn không có quyền quản lý đơn hàng này!");
        }

        // Đảm bảo đơn ở trạng thái COMPLETED hoặc CONFIRMED
        if (!["COMPLETED", "CONFIRMED"].includes(booking.status)) {
            throw new Error("Chỉ có thể xử lý trả đồ cho đơn hàng đã đặt thành công hoặc đã hoàn tất!");
        }

        const rentedEquipments = await BookingEquipment.find({ bookingId: booking._id });
        if (rentedEquipments.length === 0) {
            throw new Error("Đơn hàng này không có thiết bị thuê kèm!");
        }

        for (const item of rentedEquipments) {
            // Xem cấu hình trạng thái trả về cho món này như thế nào
            const itemUpdate = items.find(i => i.equipmentId.toString() === item.equipmentId.toString());
            const status = itemUpdate?.status?.toUpperCase() || "RETURNED";

            if (!["RETURNED", "DAMAGED", "LOST"].includes(status)) {
                throw new Error(`Trạng thái trả đồ "${status}" không hợp lệ!`);
            }

            item.returnStatus = status;
            await item.save();

            // Cập nhật số lượng thiết bị trong kho tương ứng
            const equipment = await Equipment.findById(item.equipmentId);
            if (equipment) {
                if (status === "RETURNED") {
                    // Không cần tăng availableQuantity vì lúc thuê không trừ globally
                } else if (status === "DAMAGED") {
                    equipment.damagedCount += item.quantity;
                    equipment.availableQuantity = Math.max(0, equipment.availableQuantity - item.quantity);
                    if (equipment.availableQuantity - (equipment.maintenanceQuantity || 0) <= 0) {
                        equipment.status = "DAMAGED";
                    }
                } else if (status === "LOST") {
                    equipment.lostCount += item.quantity;
                    equipment.quantity = Math.max(0, equipment.quantity - item.quantity);
                    equipment.availableQuantity = Math.max(0, equipment.availableQuantity - item.quantity);
                    if (equipment.availableQuantity - (equipment.maintenanceQuantity || 0) <= 0) {
                        equipment.status = "DAMAGED";
                    }
                }
                await equipment.save();
            }
        }

        return { message: "Xử lý trả thiết bị thuê thành công!", booking };
    }

    // 5. Đánh giá (Vendor Reviews)
    async getVendorReviews(vendorId) {
        const courts = await Court.find({ vendorId });
        const courtIds = courts.map(c => c._id);

        return await Review.find({ courtId: { $in: courtIds } })
            .populate("userId", "fullName email avatar")
            .populate("courtId", "name location")
            .sort({ createdAt: -1 });
    }

    // ======================== VENDOR IMPORT ORDERS ========================
    async getVendorImportOrders(vendorId) {
        const orders = await ImportOrder.find({ vendorId })
            .populate("equipmentId", "name type image")
            .populate("adminId", "fullName email")
            .sort({ createdAt: -1 });

        return await Promise.all(orders.map(async (order) => {
            const delivery = await Delivery.findOne({ importOrderId: order._id })
                .populate("shipperId", "fullName email phone");
            return {
                ...order.toObject(),
                delivery: delivery ? delivery.toObject() : null
            };
        }));
    }

    async confirmImportOrder(vendorId, orderId) {
        const order = await ImportOrder.findOne({ _id: orderId, vendorId });
        if (!order) throw new Error("Yêu cầu nhập kho không tồn tại hoặc không thuộc quyền quản lý của bạn!");
        if (order.status !== "PENDING") {
            throw new Error(`Đơn hàng không ở trạng thái PENDING (Hiện tại: ${order.status})`);
        }
        order.status = "CONFIRMED";
        await order.save();

        // Tự động tạo bản ghi Delivery (chưa có shipperId)
        await Delivery.create({
            importOrderId: order._id,
            status: "PENDING",
            shipperId: null
        });

        return {
            message: "Xác nhận đơn nhập kho thành công! Vui lòng gán shipper cho vận đơn.",
            order
        };
    }

    async completeImportOrder(vendorId, orderId) {
        const order = await ImportOrder.findOne({ _id: orderId, vendorId });
        if (!order) throw new Error("Yêu cầu nhập kho không tồn tại hoặc không thuộc quyền quản lý của bạn!");
        if (order.status !== "CONFIRMED") {
            throw new Error(`Đơn hàng phải ở trạng thái CONFIRMED mới có thể hoàn thành (Hiện tại: ${order.status})`);
        }

        // Kiểm tra xem đơn hàng đã được gán shipper chưa
        const delivery = await Delivery.findOne({ importOrderId: order._id });
        if (delivery && delivery.shipperId) {
            throw new Error("Đơn hàng này đã được gán cho shipper. Vui lòng hoàn thành giao nhận trong phần Quản lý vận đơn!");
        }

        const equipment = await Equipment.findById(order.equipmentId);
        if (!equipment) throw new Error("Dụng cụ thiết bị liên kết không tồn tại trên hệ thống!");

        // ✅ Fix #7: Guard chống double-stock — chỉ cộng kho khi order chưa ở trạng thái COMPLETED
        const wasAlreadyCompleted = order.status === "COMPLETED";

        // Hoàn thành đơn hàng
        order.status = "COMPLETED";
        await order.save();

        if (!wasAlreadyCompleted) {
            // Cộng tồn kho dụng cụ (chỉ 1 lần, tránh gọi cả completeImportOrder lẫn confirmDeliveryCompleted)
            equipment.quantity += order.quantity;
            equipment.availableQuantity += order.quantity;
            if (equipment.status !== "AVAILABLE") {
                equipment.status = "AVAILABLE";
            }
            await equipment.save();
        }

        // Đồng thời cập nhật trạng thái Delivery thành COMPLETED (nếu có)
        await Delivery.findOneAndUpdate(
            { importOrderId: order._id },
            { $set: { status: "COMPLETED", completedAt: new Date() } }
        );

        return {
            message: "Giao hàng hoàn tất! Số lượng tồn kho đã được cập nhật.",
            order,
            equipment
        };
    }

    async getShippers() {
        return await User.find({ role: "SHIPPER", status: "ACTIVE" }).select("fullName email phone avatar");
    }

    async assignShipper(vendorId, orderId, shipperId) {
        const order = await ImportOrder.findOne({ _id: orderId, vendorId }).populate("equipmentId", "name");
        if (!order) throw new Error("Đơn nhập kho không tồn tại hoặc không thuộc quyền quản lý của bạn!");
        if (order.status !== "CONFIRMED") {
            throw new Error("Chỉ có thể gán shipper cho đơn hàng ở trạng thái CONFIRMED!");
        }

        const shipper = await User.findOne({ _id: shipperId, role: "SHIPPER", status: "ACTIVE" });
        if (!shipper) throw new Error("Shipper không tồn tại hoặc đang bị khóa!");

        let delivery = await Delivery.findOne({ importOrderId: orderId });
        if (delivery) {
            delivery.shipperId = shipperId;
            delivery.status = "PENDING";
            delivery.assignedAt = new Date();
            await delivery.save();
        } else {
            delivery = await Delivery.create({
                importOrderId: orderId,
                shipperId,
                status: "PENDING",
                assignedAt: new Date()
            });
        }

        // Tạo thông báo cho Shipper
        await notificationService.createForUser({
            userId: shipperId,
            title: "Bạn có đơn giao hàng mới",
            message: `Bạn được gán giao thiết bị "${order.equipmentId?.name}" (Số lượng: ${order.quantity}). Vui lòng nhận hàng tại nhà cung cấp.`,
            type: "SYSTEM",
            referenceId: delivery._id,
            referenceType: "Delivery"
        });

        return delivery;
    }

    async confirmDeliveryCompleted(vendorId, deliveryId) {
        const delivery = await Delivery.findById(deliveryId).populate({
            path: "importOrderId",
            populate: { path: "equipmentId" }
        });

        if (!delivery) throw new Error("Không tìm thấy vận đơn!");
        if (delivery.importOrderId.vendorId.toString() !== vendorId.toString()) {
            throw new Error("Bạn không có quyền xác nhận hoàn thành vận đơn này!");
        }

        if (delivery.status !== "SHIPPED") {
            throw new Error("Vận đơn phải ở trạng thái SHIPPED (Đã giao hàng) mới có thể xác nhận hoàn thành!");
        }

        if (!delivery.proofImage) {
            throw new Error("Không thể hoàn thành vận đơn khi chưa có ảnh minh chứng giao nhận từ shipper!");
        }

        const order = await ImportOrder.findById(delivery.importOrderId._id);
        const equipment = await Equipment.findById(order.equipmentId);

        if (!equipment) throw new Error("Thiết bị liên kết không tồn tại trên hệ thống!");

        // ✅ Fix #7: Guard chống double-stock — chỉ cộng kho khi order chưa ở COMPLETED
        const wasAlreadyCompleted = order.status === "COMPLETED";

        // Hoàn thành đơn hàng và vận đơn
        order.status = "COMPLETED";
        await order.save();

        delivery.status = "COMPLETED";
        delivery.completedAt = new Date();
        await delivery.save();

        if (!wasAlreadyCompleted) {
            // Cộng tồn kho dụng cụ (chỉ 1 lần, tránh double-stock nếu completeImportOrder đã chạy trước)
            equipment.quantity += order.quantity;
            equipment.availableQuantity += order.quantity;
            if (equipment.status !== "AVAILABLE") {
                equipment.status = "AVAILABLE";
            }
            await equipment.save();
        }

        // Thông báo cho Shipper
        await notificationService.createForUser({
            userId: delivery.shipperId,
            title: "Đơn giao hàng đã hoàn tất",
            message: `Đơn giao thiết bị "${equipment.name}" đã được Vendor xác nhận hoàn tất thành công!`,
            type: "SYSTEM",
            referenceId: delivery._id,
            referenceType: "Delivery"
        });

        // Thông báo cho Admins
        await notificationService.createForAdmins({
            title: "Đơn nhập kho hoàn tất",
            message: `Đơn nhập kho #${order._id} cho thiết bị "${equipment.name}" đã hoàn thành giao nhận.`,
            type: "SYSTEM",
            referenceId: order._id,
            referenceType: "ImportOrder"
        });

        return { delivery, order };
    }

    async cancelVendorImportOrder(vendorId, orderId) {
        const order = await ImportOrder.findOne({ _id: orderId, vendorId });
        if (!order) throw new Error("Yêu cầu nhập kho không tồn tại hoặc không thuộc quyền quản lý của bạn!");
        if (["COMPLETED", "CANCELLED"].includes(order.status)) {
            throw new Error("Không thể hủy đơn nhập đã hoàn thành hoặc đã bị hủy trước đó!");
        }
        order.status = "CANCELLED";
        await order.save();

        // Hủy Delivery nếu có
        await Delivery.findOneAndUpdate(
            { importOrderId: order._id },
            { $set: { status: "CANCELLED" } }
        );

        return {
            message: "Hủy/Từ chối đơn nhập kho thành công!",
            order
        };
    }

    // ======================== VENDOR MAINTENANCE ========================
    async getVendorMaintenance(vendorId) {
        const records = await Maintenance.find({ assignedVendorId: vendorId })
            .populate("createdBy", "fullName email")
            .populate("assignedStaffId", "fullName email phone maintenanceSkills avatar")
            .populate("workLogs.updatedBy", "fullName email phone role")
            .sort({ createdAt: -1 });

        // Manually lookup names to return target object names
        const courtIds = records.filter(r => r.targetType === "COURT").map(r => r.targetId);
        const eqIds = records.filter(r => r.targetType === "EQUIPMENT").map(r => r.targetId);

        const [courts, equipments] = await Promise.all([
            Court.find({ _id: { $in: courtIds } }).select("name location"),
            Equipment.find({ _id: { $in: eqIds } }).select("name")
        ]);

        const courtMap = new Map(courts.map(c => [c._id.toString(), c]));
        const eqMap = new Map(equipments.map(e => [e._id.toString(), e]));

        return records.map(r => {
            const rObj = r.toObject();
            if (r.targetType === "COURT") {
                const court = courtMap.get(r.targetId.toString());
                rObj.targetName = court ? court.name : "Sân đã xóa";
                rObj.targetLocation = court ? court.location : "";
            } else {
                const eq = eqMap.get(r.targetId.toString());
                rObj.targetName = eq ? eq.name : "Thiết bị đã xóa";
            }
            return rObj;
        });
    }

    async updateVendorMaintenanceStatus(vendorId, maintenanceId, newStatus) {
        const record = await Maintenance.findOne({ _id: maintenanceId, assignedVendorId: vendorId });
        if (!record) {
            throw new Error("Yêu cầu bảo trì không tồn tại hoặc không thuộc quyền quản lý của bạn!");
        }

        const validStatuses = ["REPORTED", "ASSIGNED", "IN_PROGRESS", "PENDING_CONFIRMATION", "COMPLETED"];
        if (!validStatuses.includes(newStatus.toUpperCase())) {
            throw new Error("Trạng thái không hợp lệ!");
        }

        const updateData = { status: newStatus.toUpperCase() };

        if (newStatus.toUpperCase() === "COMPLETED") {
            updateData.completedDate = new Date();

            if (record.targetType === "COURT") {
                // Chỉ restore các SubCourt đã bị block khi tạo maintenance
                const subCourtIdsToRestore = record.affectedSubCourtIds || [];
                if (subCourtIdsToRestore.length > 0) {
                    await SubCourt.updateMany(
                        { _id: { $in: subCourtIdsToRestore } },
                        { $set: { status: "AVAILABLE" } }
                    );
                } else {
                    // Fallback cho bản ghi cũ không có affectedSubCourtIds
                    await SubCourt.updateMany(
                        { courtId: record.targetId },
                        { $set: { status: "AVAILABLE" } }
                    );
                }
            } else if (record.targetType === "EQUIPMENT") {
                const eq = await Equipment.findById(record.targetId);
                if (eq) {
                    const restoreQty = record.equipmentMaintenanceQty || 1;
                    const currentMaintQty = eq.maintenanceQuantity || 0;
                    const newMaintenanceQuantity = Math.max(0, currentMaintQty - restoreQty);
                    const newDamagedCount = Math.max(0, (eq.damagedCount || 0) - restoreQty);
                    // Restore status nếu trước đó bị DAMAGED do hết hàng bảo trì
                    const restoredStatus = eq.status === "DAMAGED" && (eq.availableQuantity - newMaintenanceQuantity > 0)
                        ? "AVAILABLE"
                        : eq.status;
                    await Equipment.findByIdAndUpdate(record.targetId, {
                        $set: {
                            maintenanceQuantity: newMaintenanceQuantity,
                            damagedCount: newDamagedCount,
                            status: restoredStatus
                        }
                    });
                }
            }
        }

        return await Maintenance.findByIdAndUpdate(maintenanceId, { $set: updateData }, { new: true });
    }

    async getMaintenanceStaff(targetType) {
        const filter = { role: "MAINTENANCE_STAFF", status: "ACTIVE" };
        if (targetType && ["COURT", "EQUIPMENT"].includes(targetType.toUpperCase())) {
            filter.maintenanceSkills = targetType.toUpperCase();
        }

        return await User.find(filter)
            .select("fullName email phone avatar maintenanceSkills")
            .sort({ fullName: 1 });
    }

    async assignMaintenanceStaff(vendorId, maintenanceId, staffId) {
        const record = await Maintenance.findOne({ _id: maintenanceId, assignedVendorId: vendorId });
        if (!record) {
            throw new Error("Yêu cầu bảo trì không tồn tại hoặc không thuộc quyền quản lý của bạn!");
        }
        if (record.status === "COMPLETED") {
            throw new Error("Yêu cầu đã hoàn tất, không thể phân công lại thợ bảo trì!");
        }

        const staff = await User.findOne({
            _id: staffId,
            role: "MAINTENANCE_STAFF",
            status: "ACTIVE",
            maintenanceSkills: record.targetType
        });
        if (!staff) {
            throw new Error("Thợ bảo trì không tồn tại, đang bị khóa hoặc không có kỹ năng phù hợp!");
        }

        record.assignedStaffId = staffId;
        record.assignedAt = new Date();
        record.status = "ASSIGNED";
        record.workLogs.push({
            status: "ASSIGNED",
            note: "Chủ sở hữu đã phân công thợ bảo trì.",
            images: [],
            updatedBy: vendorId
        });
        await record.save();

        await notificationService.createForUser({
            userId: staffId,
            title: "Bạn được phân công yêu cầu bảo trì mới",
            message: `Yêu cầu "${record.title}" đã được giao cho bạn xử lý.`,
            type: "SYSTEM",
            referenceId: record._id,
            referenceType: "Maintenance"
        });

        return await Maintenance.findById(record._id)
            .populate("createdBy", "fullName email")
            .populate("assignedStaffId", "fullName email phone maintenanceSkills avatar");
     }

     async getEquipmentRentals(vendorId, equipmentId) {
         if (!equipmentId) throw new Error("Thiếu mã thiết bị!");
         await bookingService.autoCompletePastBookings();
         const eq = await Equipment.findOne({ _id: equipmentId, vendorId });
         if (!eq) throw new Error("Thiết bị không tồn tại hoặc không thuộc quyền quản lý của bạn!");

         const rentals = await BookingEquipment.find({ equipmentId })
             .populate({
                 path: "bookingId",
                 populate: {
                     path: "userId",
                     select: "fullName phone email"
                 }
             });

         const activeRentals = rentals
             .filter(r => r.bookingId && !["CANCELLED"].includes(r.bookingId.status))
             .map(r => ({
                 bookingCode: r.bookingId.bookingCode,
                 bookingId: r.bookingId._id,
                 clientName: r.bookingId.userId?.fullName || "Khách hàng",
                 clientPhone: r.bookingId.userId?.phone || "N/A",
                 bookingDate: r.bookingId.bookingDate,
                 startTime: r.bookingId.startTime,
                 endTime: r.bookingId.endTime,
                 status: r.bookingId.status,
                 quantity: r.quantity,
                 rentalPrice: r.rentalPrice,
                 subtotal: r.subtotal,
                 returnStatus: r.returnStatus
             }))
             .sort((a, b) => {
                 if (a.bookingDate !== b.bookingDate) {
                     return a.bookingDate.localeCompare(b.bookingDate);
                 }
                 return a.startTime.localeCompare(b.startTime);
             });

         return activeRentals;
     }

     async getVendorSubCourts(vendorId, courtId) {
          const court = await Court.findOne({ _id: courtId, vendorId });
          if (!court) throw new Error("Cụm sân không tồn tại hoặc không thuộc quyền quản lý của bạn!");
          return await SubCourt.find({ courtId }).sort({ name: 1 });
      }

      async createVendorSubCourt(vendorId, courtId, name) {
          if (!courtId || !name) throw new Error("Vui lòng nhập đầy đủ thông tin!");
          const court = await Court.findOne({ _id: courtId, vendorId });
          if (!court) throw new Error("Cụm sân không tồn tại hoặc không thuộc quyền quản lý của bạn!");

          const duplicate = await SubCourt.findOne({ courtId, name: name.trim(), status: { $ne: "HIDDEN" } });
          if (duplicate) throw new Error(`Sân nhỏ với tên "${name.trim()}" đã tồn tại trong cụm sân này!`);

          const hiddenSubCourt = await SubCourt.findOne({ courtId, name: name.trim(), status: "HIDDEN" });
          let subCourt;
          if (hiddenSubCourt) {
              hiddenSubCourt.status = "AVAILABLE";
              subCourt = await hiddenSubCourt.save();
          } else {
              subCourt = await SubCourt.create({
                  courtId,
                  name: name.trim(),
                  status: "AVAILABLE"
              });
          }

          await generateSlotsForNewSubCourt(courtId, subCourt);
          return { message: "Tạo sân nhỏ mới thành công!", subCourt };
      }

      async updateVendorSubCourt(vendorId, subCourtId, data) {
          const { name, status } = data;
          const subCourt = await SubCourt.findById(subCourtId);
          if (!subCourt) throw new Error("Sân nhỏ không tồn tại!");

          const court = await Court.findOne({ _id: subCourt.courtId, vendorId });
          if (!court) throw new Error("Sân nhỏ này không thuộc cụm sân bạn quản lý!");

          if (name && name.trim() !== subCourt.name) {
              const duplicate = await SubCourt.findOne({ 
                  courtId: subCourt.courtId, 
                  name: name.trim(), 
                  _id: { $ne: subCourtId },
                  status: { $ne: "HIDDEN" }
              });
              if (duplicate) throw new Error(`Sân nhỏ với tên "${name.trim()}" đã tồn tại trong cụm sân này!`);
              subCourt.name = name.trim();
          }

          if (status && status !== subCourt.status) {
              const upperStatus = status.toUpperCase();
              if (!["AVAILABLE", "MAINTENANCE", "HIDDEN"].includes(upperStatus)) {
                  throw new Error("Trạng thái không hợp lệ!");
              }

              if (["MAINTENANCE", "HIDDEN"].includes(upperStatus)) {
                  const todayStr = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).split(" ")[0];
                  const activeBookingsExist = await CourtSlot.exists({
                      subCourtId,
                      date: { $gte: todayStr },
                      isBooked: true
                  });
                  if (activeBookingsExist) {
                      throw new Error("Không thể thay đổi trạng thái sân nhỏ này vì đã có lịch đặt trong tương lai!");
                  }
              }
              subCourt.status = upperStatus;
          }

          const updated = await subCourt.save();
          if (updated.status === "AVAILABLE") {
              await generateSlotsForNewSubCourt(updated.courtId, updated);
          }

          return { message: "Cập nhật sân nhỏ thành công!", subCourt: updated };
      }

      async deleteVendorSubCourt(vendorId, subCourtId) {
          const subCourt = await SubCourt.findById(subCourtId);
          if (!subCourt) throw new Error("Sân nhỏ không tồn tại!");

          const court = await Court.findOne({ _id: subCourt.courtId, vendorId });
          if (!court) throw new Error("Sân nhỏ này không thuộc cụm sân bạn quản lý!");

          const todayStr = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).split(" ")[0];
          const activeBookingsExist = await CourtSlot.exists({
              subCourtId,
              date: { $gte: todayStr },
              isBooked: true
          });
          if (activeBookingsExist) {
              throw new Error("Không thể xóa sân nhỏ này vì đã có lịch đặt trong tương lai!");
          }

          subCourt.status = "HIDDEN";
          await subCourt.save();

          await CourtSlot.deleteMany({
              subCourtId,
              date: { $gte: todayStr },
              isBooked: false
          });

          return { message: "Đã xóa sân nhỏ thành công!" };
      }

}

export default new VendorService();
