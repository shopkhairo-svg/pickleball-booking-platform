// src/repositories/admin.repository.js
import Court from "../models/court.model.js";
import Booking from "../models/booking.model.js";
import Equipment from "../models/equipment.model.js";
import Maintenance from "../models/maintenance.model.js";
import User from "../models/user.model.js";
import SubCourt from "../models/subCourt.model.js";
import CourtSlot from "../models/courtSlot.model.js";
import BookingEquipment from "../models/bookingEquipment.model.js";

class AdminRepository {
    // ======================== COURTS ========================
    /**
     * Lấy danh sách tất cả sân (Kể cả HIDDEN/MAINTENANCE) có phân trang + lọc
     */
    async findAllCourts(filter, skip, limit) {
        const [courts, total] = await Promise.all([
            Court.find(filter)
                .populate("vendorId", "fullName email phone vendorType")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Court.countDocuments(filter)
        ]);
        return { courts, total };
    }

    async findCourtById(id) {
        return await Court.findById(id)
            .populate("vendorId", "fullName email phone vendorType");
    }

    async findSubCourtsByCourtId(courtId) {
        return await SubCourt.find({ courtId }).select("name status").sort({ name: 1 });
    }

    async createCourt(data) {
        return await Court.create(data);
    }

    async updateCourt(id, data) {
        return await Court.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true, runValidators: true }
        );
    }

    async softDeleteCourt(id) {
        return await Court.findByIdAndUpdate(
            id,
            { $set: { status: "HIDDEN" } },
            { new: true }
        );
    }

    // ======================== BOOKINGS ========================
    async findAllBookings(filter, skip, limit) {
        const [bookings, total] = await Promise.all([
            Booking.find(filter)
                .populate("userId", "fullName email phone avatar")
                .populate("courtId", "name location address images")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Booking.countDocuments(filter)
        ]);
        return { bookings, total };
    }

    async findBookingById(id) {
        return await Booking.findById(id)
            .populate("userId", "fullName email phone avatar")
            .populate("courtId", "name location address images");
    }

    // ======================== EQUIPMENT ========================
    async findAllEquipments(filter, skip, limit) {
        const [equipments, total] = await Promise.all([
            Equipment.find(filter)
                .populate("courtId", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Equipment.countDocuments(filter)
        ]);
        return { equipments, total };
    }

    async findEquipmentById(id) {
        return await Equipment.findById(id);
    }

    async createEquipment(data) {
        return await Equipment.create(data);
    }

    async updateEquipment(id, data) {
        return await Equipment.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true, runValidators: true }
        );
    }

    async deleteEquipment(id) {
        return await Equipment.findByIdAndDelete(id);
    }

    // ======================== MAINTENANCE ========================
    async findAllMaintenance(filter, skip, limit) {
        const [records, total] = await Promise.all([
            Maintenance.find(filter)
                .populate("createdBy", "fullName email")
                .populate("assignedStaffId", "fullName email phone")
                .populate("workLogs.updatedBy", "fullName email phone role")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Maintenance.countDocuments(filter)
        ]);
        return { records, total };
    }

    async findMaintenanceById(id) {
        return await Maintenance.findById(id)
            .populate("createdBy", "fullName email")
            .populate("assignedStaffId", "fullName email phone")
            .populate("workLogs.updatedBy", "fullName email phone role");
    }

    async createMaintenance(data) {
        return await Maintenance.create(data);
    }

    async updateMaintenance(id, data) {
        return await Maintenance.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true }
        );
    }

    // ======================== USERS ========================
    async findAllUsers(filter, skip, limit) {
        const [users, total] = await Promise.all([
            User.find(filter)
                .select("-password")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments(filter)
        ]);
        return { users, total };
    }

    async findUserById(id) {
        return await User.findById(id).select("-password");
    }

    async toggleUserStatus(id, newStatus) {
        return await User.findByIdAndUpdate(
            id,
            { $set: { status: newStatus } },
            { new: true }
        ).select("-password");
    }

    // ======================== ANALYTICS AGGREGATIONS ========================
    /**
     * Thống kê tổng quan Dashboard
     */
    async getDashboardCounts() {
        const [totalCourts, totalBookings, totalUsers, totalVendors, totalEquipments] = await Promise.all([
            Court.countDocuments({ status: { $ne: "HIDDEN" } }),
            Booking.countDocuments(),
            User.countDocuments({ role: "USER" }),
            User.countDocuments({ role: "VENDOR" }),
            Equipment.countDocuments()
        ]);
        return { totalCourts, totalBookings, totalUsers, totalVendors, totalEquipments };
    }

    /**
     * Thống kê doanh thu theo khoảng thời gian
     */
    async getRevenueByDateRange(startDate, endDate) {
        return await Booking.aggregate([
            {
                $match: {
                    status: { $in: ["CONFIRMED", "COMPLETED"] },
                    bookingDate: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: "$bookingDate",
                    totalRevenue: { $sum: "$totalPrice" },
                    courtRevenue: { $sum: "$courtPrice" },
                    equipmentRevenue: { $sum: "$equipmentPrice" },
                    bookingCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
    }

    /**
     * Tổng doanh thu toàn hệ thống
     */
    async getTotalRevenue() {
        const result = await Booking.aggregate([
            {
                $match: {
                    status: { $in: ["CONFIRMED", "COMPLETED"] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalPrice" },
                    courtRevenue: { $sum: "$courtPrice" },
                    equipmentRevenue: { $sum: "$equipmentPrice" }
                }
            }
        ]);
        return result[0] || { totalRevenue: 0, courtRevenue: 0, equipmentRevenue: 0 };
    }

    /**
     * Thống kê thiết bị được thuê nhiều nhất
     */
    async getEquipmentRentalStats() {
        return await BookingEquipment.aggregate([
            {
                $group: {
                    _id: "$equipmentId",
                    totalRented: { $sum: "$quantity" },
                    totalRevenue: { $sum: "$subtotal" }
                }
            },
            {
                $lookup: {
                    from: "equipments",
                    localField: "_id",
                    foreignField: "_id",
                    as: "equipment"
                }
            },
            { $unwind: "$equipment" },
            {
                $project: {
                    name: "$equipment.name",
                    type: "$equipment.type",
                    totalRented: 1,
                    totalRevenue: 1,
                    damagedCount: "$equipment.damagedCount",
                    lostCount: "$equipment.lostCount"
                }
            },
            { $sort: { totalRented: -1 } }
        ]);
    }

    /**
     * Thống kê giờ cao điểm sử dụng sân
     */
    async getPeakHoursStats() {
        return await Booking.aggregate([
            {
                $match: {
                    status: { $in: ["CONFIRMED", "COMPLETED"] }
                }
            },
            {
                $group: {
                    _id: "$startTime",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
    }

    async getTopCourtsByBooking() {
        return await Booking.aggregate([
            {
                $match: {
                    status: { $in: ["CONFIRMED", "COMPLETED"] },
                    paymentStatus: "PAID"
                }
            },
            {
                $group: {
                    _id: "$courtId",
                    bookingCount: { $sum: 1 },
                    totalRevenue: { $sum: "$totalPrice" }
                }
            },
            { $sort: { bookingCount: -1, totalRevenue: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "courts",
                    localField: "_id",
                    foreignField: "_id",
                    as: "court"
                }
            },
            { $unwind: "$court" },
            {
                $project: {
                    name: "$court.name",
                    location: "$court.location",
                    bookingCount: 1,
                    totalRevenue: 1
                }
            }
        ]);
    }

    /**
     * Thống kê booking theo trạng thái
     */
    async getBookingStatusStats() {
        return await Booking.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);
    }

    /**
     * Tỷ lệ lấp đầy sân (Số slot đã đặt / Tổng slot)
     */
    async getCourtOccupancyRate() {
        const [totalSlots, bookedSlots] = await Promise.all([
            CourtSlot.countDocuments(),
            CourtSlot.countDocuments({ isBooked: true })
        ]);
        return {
            totalSlots,
            bookedSlots,
            occupancyRate: totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0
        };
    }
}

export default new AdminRepository();
