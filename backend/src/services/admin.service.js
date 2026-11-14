import { cancelCoreBooking, confirmCoreBooking, completeCoreBooking, recordCoreRefund } from "./bookingLifecycle.service.js";
import mongoose from "mongoose";
import { courtDate, queryNumber } from "../utils/courtQuery.js";
import { searchPattern } from "../utils/courtFilters.js";
import { parseCourtInput, courtText, courtStatus, scheduleChanged, assertCourtCanClose, assertScheduleAllowsBookings } from "../utils/courtInput.js";
import { buildCourtFilters } from "../utils/courtFilters.js";
// src/services/admin.service.js
import adminRepository from "../repositories/admin.repository.js";
import Court from "../models/court.model.js";
import SubCourt from "../models/subCourt.model.js";
import CourtSlot from "../models/courtSlot.model.js";
import Booking from "../models/booking.model.js";
import Equipment from "../models/equipment.model.js";
import BookingEquipment from "../models/bookingEquipment.model.js";
import Review from "../models/review.model.js";
import RevenueLog from "../models/revenueLog.model.js";
import revenueService from "./revenue.service.js";
import notificationService from "./notification.service.js";
import pointsService from "./points.service.js";
import User from "../models/user.model.js";
import uploadService from "./upload.service.js";
import systemSettingService from "./systemSetting.service.js";
import ImportOrder from "../models/importOrder.model.js";
import Delivery from "../models/delivery.model.js";
import { generateSlotsForNewSubCourt, regenerateSlotsForCourt } from "../utils/slotScheduler.js";
import bookingService from "./booking.service.js";



class AdminService {
    // ======================== COURTS ========================
    /**
     * Lấy danh sách tất cả sân (Admin thấy cả HIDDEN/MAINTENANCE)
     */
    async getAllCourts(queryParams) {
        const { filter, limit: parsedLimit, page: parsedPage, skip } = buildCourtFilters({ ...queryParams, limit: queryParams.limit ?? 10 });
        if (queryParams.status !== undefined && queryParams.status !== "") filter.status = courtStatus(queryParams.status);

        const { courts, total } = await adminRepository.findAllCourts(filter, skip, parsedLimit);

        const courtsWithDetails = [];
        for (const court of courts) {
            const subCourtsCount = await SubCourt.countDocuments({ courtId: court._id, status: { $ne: "HIDDEN" } });
            courtsWithDetails.push({
                ...court.toObject(),
                subCourtsCount
            });
        }

        return {
            courts: courtsWithDetails,
            pagination: {
                totalItems: total,
                currentPage: parsedPage,
                totalPages: Math.ceil(total / parsedLimit),
                limit: parsedLimit
            }
        };
    }

    /**
     * Xem chi tiết sân
     */
    async getCourtDetail(courtId) {
        if (!courtId) throw new Error("Thiếu mã ID cụm sân!");
        const court = await adminRepository.findCourtById(courtId);
        if (!court) throw new Error("Cụm sân không tồn tại trên hệ thống!");

        // Lấy luôn danh sách sân nhỏ thuộc cụm
        const subCourts = await SubCourt.find({ courtId });
        return { court, subCourts };
    }

    /**
     * Tạo sân mới (Kèm upload hình ảnh Cloudinary)
     */
    async createCourt(courtData, files) {
        const input = parseCourtInput(courtData);
        const images = files?.map(file => ({ imageUrl: file.path, publicId: file.filename })) || [];
        const newCourt = await adminRepository.createCourt({ ...input, images, status: "AVAILABLE" });
        return { message: "Tạo cụm sân mới thành công!", court: newCourt };
    }

    /**
     * Cập nhật thông tin sân
     */
    async updateCourt(courtId, courtData, files) {
        const court = await adminRepository.findCourtById(courtId);
        if (!court) throw new Error("Cụm sân không tồn tại!");
        const updateData = parseCourtInput(courtData, court);
        if (updateData.status && updateData.status !== "AVAILABLE" && updateData.status !== court.status) await assertCourtCanClose({ courtId });
        await assertScheduleAllowsBookings(courtId, updateData, court);
        if (files?.length) updateData.images = [...court.images, ...files.map(file => ({ imageUrl: file.path, publicId: file.filename }))];
        const updatedCourt = await adminRepository.updateCourt(courtId, updateData);
        let slotsPending = false;
        if (updatedCourt.status === "AVAILABLE" && (scheduleChanged(updateData, court) || court.status !== "AVAILABLE")) {
            try { await regenerateSlotsForCourt(courtId); }
            catch (error) { slotsPending = true; console.error("[Slots] Reconciliation pending", String(courtId), error.message); }
        }
        return { message: slotsPending ? "Đã lưu thông tin sân; lịch giờ sẽ được đồng bộ lại tự động." : "Cập nhật thông tin cụm sân thành công!", court: updatedCourt, slotsPending };
    }

    /**
     * Soft delete sân (Chuyển status sang HIDDEN)
     */
    async deleteCourt(courtId) {
        const court = await adminRepository.findCourtById(courtId);
        if (!court) throw new Error("Cụm sân không tồn tại!");

        await assertCourtCanClose({ courtId });
        const deletedCourt = await adminRepository.softDeleteCourt(courtId);
        return {
            message: "Đã ẩn cụm sân khỏi hệ thống thành công!",
            court: deletedCourt
        };
    }

    /**
     * Block sân bảo trì (Chuyển status sang MAINTENANCE)
     */
    async blockCourt(courtId) {
        const court = await adminRepository.findCourtById(courtId);
        if (!court) throw new Error("Cụm sân không tồn tại!");

        const newStatus = court.status === "AVAILABLE" ? "MAINTENANCE" : "AVAILABLE";
        if (newStatus !== "AVAILABLE") await assertCourtCanClose({ courtId });
        const updatedCourt = await adminRepository.updateCourt(courtId, { status: newStatus });

        if (newStatus === "AVAILABLE") {
            const subCourts = await SubCourt.find({ courtId, status: "AVAILABLE" });
            for (const sub of subCourts) {
                await generateSlotsForNewSubCourt(courtId, sub);
            }
        }

        return {
            message: newStatus === "MAINTENANCE"
                ? "Đã chuyển sân sang trạng thái bảo trì!"
                : "Đã mở lại sân hoạt động bình thường!",
            court: updatedCourt
        };
    }

    // ======================== BOOKINGS ========================
    /**
     * Lấy danh sách tất cả booking (Admin view)
     */
    async getAllBookings(queryParams) {
        const { status, courtId, startDate, endDate, search, limit = 10, page = 1 } = queryParams;

        const parsedLimit = queryNumber(limit, { min: 1, max: 100, integer: true });
        const parsedPage = queryNumber(page, { min: 1, max: 10000, integer: true });
        const skip = (parsedPage - 1) * parsedLimit;

        const filter = { reservationState: { $nin: ["PREPARING", "FAILED"] } };

        if (status && ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"].includes(status.toUpperCase())) {
            filter.status = status.toUpperCase();
        }
        if (courtId) {
            if (!mongoose.isValidObjectId(courtId)) throw new Error("Mã sân không hợp lệ.");
            filter.courtId = courtId;
        }
        if (search) filter.bookingCode = { $regex: searchPattern(search), $options: "i" };
        if (startDate || endDate) {
            filter.bookingDate = {};
            if (startDate) filter.bookingDate.$gte = courtDate(startDate);
            if (endDate) filter.bookingDate.$lte = courtDate(endDate);
            if (startDate && endDate && startDate > endDate) throw new Error("Khoảng ngày không hợp lệ.");
        }

        const { bookings, total } = await adminRepository.findAllBookings(filter, skip, parsedLimit);

        let enrichedBookings = bookings;
        if (bookings && bookings.length > 0) {
            const bookingIds = bookings.map(b => b._id);
            const equipmentRentals = await BookingEquipment.find({ bookingId: { $in: bookingIds } })
                .populate("equipmentId", "name type image rentalType rentalPrice");
            
            enrichedBookings = bookings.map(b => {
                const bObj = b.toObject();
                const items = equipmentRentals
                    .filter(eq => eq.bookingId.toString() === b._id.toString())
                    .map(eq => ({
                        equipmentId: eq.equipmentId,
                        quantity: eq.quantity,
                        rentalPrice: eq.rentalPrice,
                        subtotal: eq.subtotal,
                        returnStatus: eq.returnStatus
                    }));
                bObj.equipmentItems = items;
                bObj.rentedEquipments = items;
                return bObj;
            });
        }

        return {
            bookings: enrichedBookings,
            pagination: {
                totalItems: total,
                currentPage: parsedPage,
                totalPages: Math.ceil(total / parsedLimit),
                limit: parsedLimit
            }
        };
    }

    /**
     * Admin xác nhận booking (PENDING → CONFIRMED)
     */
    async confirmBooking(bookingId) { return confirmCoreBooking(bookingId); }
    async completeBooking(bookingId) { return completeCoreBooking(bookingId); }
    async cancelBooking(bookingId, cancelReason) { return cancelCoreBooking(bookingId, { admin: true, reason: cancelReason }); }
    async recordRefund(bookingId, adminId) { return recordCoreRefund(bookingId, adminId); }

    async recordCashPayment(bookingId, adminId) {
        const booking = await Booking.findOneAndUpdate({ _id: bookingId, status: "CONFIRMED", paymentMethod: "CASH", paymentStatus: "UNPAID", reservationState: { $nin: ["PREPARING", "FAILED"] } }, {
            $set: { paymentStatus: "PAID", paidAt: new Date(), paymentRecordedBy: adminId }
        }, { returnDocument: "after" });
        if (!booking) throw Object.assign(new Error("Chỉ ghi nhận tiền mặt cho đơn đã xác nhận và chưa thanh toán."), { status: 409 });
        return { message: "Đã ghi nhận thu tiền tại sân.", booking };
    }

    // ======================== EQUIPMENT ========================
    /**
     * Lấy danh sách tất cả thiết bị (Admin thấy cả DAMAGED, LOST)
     */
    async getAllEquipments(queryParams) {
        const { type, status, search, limit = 10, page = 1 } = queryParams;

        const parsedLimit = parseInt(limit);
        const parsedPage = parseInt(page);
        const skip = (parsedPage - 1) * parsedLimit;

        const filter = {};

        if (type && ["PADDLE", "BALL", "ACCESSORY"].includes(type.toUpperCase())) {
            filter.type = type.toUpperCase();
        }
        if (status && ["AVAILABLE", "IN_USE", "DAMAGED", "LOST"].includes(status.toUpperCase())) {
            filter.status = status.toUpperCase();
        }
        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        const { equipments, total } = await adminRepository.findAllEquipments(filter, skip, parsedLimit);

        return {
            equipments,
            pagination: {
                totalItems: total,
                currentPage: parsedPage,
                totalPages: Math.ceil(total / parsedLimit),
                limit: parsedLimit
            }
        };
    }

    /**
     * Tạo thiết bị mới (Đăng ký hồ sơ & gửi yêu cầu nhập kho sang Vendor)
     */
    async createEquipment(adminId, data) {
        const { name, type, description, quantity, rentalType, rentalPrice, image, vendorId, courtId } = data;

        if (!name || !type || !quantity || !rentalType || !rentalPrice || !vendorId) {
            throw new Error("Vui lòng điền đầy đủ thông tin thiết bị và chọn nhà cung cấp!");
        }

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            throw new Error("Số lượng nhập ban đầu phải lớn hơn 0!");
        }

        const newEquipment = await adminRepository.createEquipment({
            name: name.trim(),
            type: type.toUpperCase(),
            description: description?.trim() || "",
            quantity: 0, // Bắt đầu bằng 0, chỉ tăng lên khi đơn nhập kho hoàn thành
            availableQuantity: 0,
            rentalType: rentalType.toUpperCase(),
            rentalPrice: parseInt(rentalPrice),
            image: image || "",
            status: "AVAILABLE",
            vendorId: vendorId,
            courtId: courtId || null
        });

        // Tạo đơn yêu cầu nhập kho PENDING gửi đến Vendor tương ứng
        const newOrder = await ImportOrder.create({
            equipmentId: newEquipment._id,
            vendorId,
            adminId,
            quantity: qty,
            status: "PENDING"
        });

        await notificationService.createForUser({
            userId: vendorId,
            title: "Yêu cầu nhập kho mới",
            message: `Admin yêu cầu cung cấp ${qty} thiết bị ${newEquipment.name}.`,
            type: "IMPORT_ORDER",
            referenceId: newOrder._id,
            referenceType: "ImportOrder"
        });

        return {
            message: "Tạo thiết bị mới và gửi yêu cầu nhập kho thành công! Đang chờ Vendor xác nhận cung cấp.",
            equipment: newEquipment,
            importOrder: newOrder
        };
    }

    /**
     * Cập nhật thông tin thiết bị
     */
    async updateEquipment(equipmentId, data) {
        const equipment = await adminRepository.findEquipmentById(equipmentId);
        if (!equipment) throw new Error("Thiết bị không tồn tại!");

        const updateData = {};
        if (data.name) updateData.name = data.name.trim();
        if (data.type) updateData.type = data.type.toUpperCase();
        if (data.description !== undefined) updateData.description = data.description.trim();
        if (data.rentalType) updateData.rentalType = data.rentalType.toUpperCase();
        if (data.rentalPrice) updateData.rentalPrice = parseInt(data.rentalPrice);
        if (data.image !== undefined) updateData.image = data.image;
        if (data.status) updateData.status = data.status.toUpperCase();

        const updatedEquipment = await adminRepository.updateEquipment(equipmentId, updateData);

        return {
            message: "Cập nhật thông tin thiết bị thành công!",
            equipment: updatedEquipment
        };
    }

    /**
     * Xóa thiết bị
     */
    async deleteEquipment(equipmentId) {
        const equipment = await adminRepository.findEquipmentById(equipmentId);
        if (!equipment) throw new Error("Thiết bị không tồn tại!");

        // Kiểm tra xem thiết bị có đang được thuê không
        const activeRentals = await BookingEquipment.countDocuments({
            equipmentId,
            returnStatus: "RENTING"
        });
        if (activeRentals > 0) {
            throw new Error("Không thể xóa thiết bị đang có người thuê!");
        }

        await adminRepository.deleteEquipment(equipmentId);

        return {
            message: "Xóa thiết bị khỏi kho thành công!"
        };
    }

    /**
     * Nhập thêm số lượng vào kho (Stock In)
     */
    async stockIn(equipmentId, additionalQuantity) {
        const equipment = await adminRepository.findEquipmentById(equipmentId);
        if (!equipment) throw new Error("Thiết bị không tồn tại!");

        const qty = parseInt(additionalQuantity);
        if (!qty || qty <= 0) throw new Error("Số lượng nhập kho phải lớn hơn 0!");

        equipment.quantity += qty;
        equipment.availableQuantity += qty;
        if (equipment.status !== "AVAILABLE") equipment.status = "AVAILABLE";
        await equipment.save();

        return {
            message: `Nhập thêm ${qty} đơn vị vào kho thành công!`,
            equipment
        };
    }
    /**
     * Tổng quan Dashboard
     */
    async getDashboardStats() {
        const [counts, revenue, occupancy, statusStats, newReviewCount, topCourtsByBooking] = await Promise.all([
            adminRepository.getDashboardCounts(),
            adminRepository.getTotalRevenue(),
            adminRepository.getCourtOccupancyRate(),
            adminRepository.getBookingStatusStats(),
            Review.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
            adminRepository.getTopCourtsByBooking()
        ]);

        return {
            ...counts,
            ...revenue,
            ...occupancy,
            newReviewCount,
            bookingStatusBreakdown: statusStats,
            topCourtsByBooking
        };
    }

    /**
     * Doanh thu theo khoảng thời gian
     */
    async getRevenueStats(queryParams) {
        const { startDate, endDate } = queryParams;

        // Mặc định: 30 ngày gần nhất
        const end = endDate || new Date().toLocaleDateString("sv-SE");
        const start = startDate || (() => {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            return d.toLocaleDateString("sv-SE");
        })();

        const revenueData = await adminRepository.getRevenueByDateRange(start, end);
        const cashFlow = await RevenueLog.find({
            createdAt: {
                $gte: new Date(`${start}T00:00:00.000Z`),
                $lte: new Date(`${end}T23:59:59.999Z`)
            }
        })
            .populate("bookingId", "bookingCode status paymentStatus")
            .populate("courtId", "name")
            .sort({ createdAt: -1 })
            .limit(100);

        return {
            period: { startDate: start, endDate: end },
            data: revenueData,
            cashFlow
        };
    }

    /**
     * Thống kê thiết bị
     */
    async getEquipmentStats() {
        const stats = await adminRepository.getEquipmentRentalStats();
        return { equipmentStats: stats };
    }

    /**
     * Giờ cao điểm
     */
    async getPeakHours() {
        const stats = await adminRepository.getPeakHoursStats();
        return { peakHours: stats };
    }

    // ======================== USERS ========================
    /**
     * Danh sách user
     */
    async getAllUsers(queryParams) {
        const { role, vendorType, status, search, limit = 10, page = 1 } = queryParams;

        const parsedLimit = parseInt(limit);
        const parsedPage = parseInt(page);
        const skip = (parsedPage - 1) * parsedLimit;

        const filter = {};
        if (role) {
            const validRoles = ["USER", "ADMIN", "VENDOR"];
            const upperRole = role.toUpperCase();
            if (validRoles.includes(upperRole)) {
                filter.role = upperRole;
            }
        }
        if (vendorType && ["COURT"].includes(vendorType.toUpperCase())) {
            filter.vendorType = vendorType.toUpperCase();
        }
        if (status && ["ACTIVE", "BLOCKED"].includes(status.toUpperCase())) {
            filter.status = status.toUpperCase();
        }
        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        const { users, total } = await adminRepository.findAllUsers(filter, skip, parsedLimit);

        return {
            users,
            pagination: {
                totalItems: total,
                currentPage: parsedPage,
                totalPages: Math.ceil(total / parsedLimit),
                limit: parsedLimit
            }
        };
    }

    /**
     * Xem chi tiết user kèm lịch sử booking
     */
    async getUserDetail(userId) {
        const user = await adminRepository.findUserById(userId);
        if (!user) throw new Error("Người dùng không tồn tại!");

        // Lấy lịch sử booking
        const bookings = await Booking.find({ userId })
            .populate("courtId", "name location")
            .sort({ createdAt: -1 })
            .limit(20);

        // Lấy lịch sử thuê thiết bị
        const bookingIds = bookings.map(b => b._id);
        const equipmentRentals = await BookingEquipment.find({ bookingId: { $in: bookingIds } })
            .populate("equipmentId", "name type");

        return {
            user,
            bookingHistory: bookings,
            equipmentRentals
        };
    }

    /**
     * Khóa / Mở tài khoản
     */
    async toggleUserStatus(userId) {
        const user = await adminRepository.findUserById(userId);
        if (!user) throw new Error("Người dùng không tồn tại!");

        if (user.role === "ADMIN") {
            throw new Error("Không thể khóa tài khoản Admin!");
        }

        const newStatus = user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
        const updatedUser = await adminRepository.toggleUserStatus(userId, newStatus);

        return {
            message: newStatus === "BLOCKED"
                ? "Đã khóa tài khoản người dùng!"
                : "Đã mở khóa tài khoản người dùng!",
            user: updatedUser
        };
    }

    // ======================== SUBCOURTS & MAINTENANCE ========================
    async getSubCourtsByCourtId(courtId) {
        const court = await adminRepository.findCourtById(courtId);
        if (!court) throw new Error('Cum san khong ton tai!');
        return await SubCourt.find({ courtId }).sort({ name: 1 });
    }

    async createSubCourt(courtId, rawName) {
        const name = courtText(rawName, "Tên sân nhỏ", { required: true });
        if (!courtId || !name) throw new Error("Vui lòng nhập đầy đủ thông tin!");
        const court = await Court.findById(courtId);
        if (!court) throw new Error("Cụm sân không tồn tại!");

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

    async updateSubCourt(subCourtId, data) {
        const name = data.name === undefined ? undefined : courtText(data.name, "Tên sân nhỏ", { required: true });
        const status = data.status === undefined ? undefined : courtStatus(data.status);
        const subCourt = await SubCourt.findById(subCourtId);
        if (!subCourt) throw new Error("Sân nhỏ không tồn tại!");

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
                await assertCourtCanClose({ subCourtId });
            }
            subCourt.status = upperStatus;
        }

        const updated = await subCourt.save();
        if (updated.status === "AVAILABLE") {
            await generateSlotsForNewSubCourt(updated.courtId, updated);
        }

        return { message: "Cập nhật sân nhỏ thành công!", subCourt: updated };
    }

    async deleteSubCourt(subCourtId) {
        const subCourt = await SubCourt.findById(subCourtId);
        if (!subCourt) throw new Error("Sân nhỏ không tồn tại!");

        const todayStr = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).split(" ")[0];
        await assertCourtCanClose({ subCourtId });

        subCourt.status = "HIDDEN";
        await subCourt.save();

        await CourtSlot.deleteMany({
            subCourtId,
            date: { $gte: todayStr },
            isBooked: false
        });

        return { message: "Đã xóa sân nhỏ thành công!" };
    }

    async getAllMaintenance(queryParams) {
        const { targetType, status, limit = 10, page = 1 } = queryParams;
        const parsedLimit = parseInt(limit); const parsedPage = parseInt(page); const skip = (parsedPage - 1) * parsedLimit;
        const filter = {};
        if (targetType && ['COURT','EQUIPMENT'].includes(targetType.toUpperCase())) filter.targetType = targetType.toUpperCase();
        if (status && ['REPORTED','ASSIGNED','IN_PROGRESS','PENDING_CONFIRMATION','COMPLETED'].includes(status.toUpperCase())) filter.status = status.toUpperCase();
        const { records, total } = await adminRepository.findAllMaintenance(filter, skip, parsedLimit);
        const courtIds = records.filter(r => r.targetType === 'COURT').map(r => r.targetId);
        const eqIds = records.filter(r => r.targetType === 'EQUIPMENT').map(r => r.targetId);
        const vendorIds = records.filter(r => r.assignedVendorId).map(r => r.assignedVendorId);
        const [courts, equipments, vendors] = await Promise.all([Court.find({ _id: { $in: courtIds } }).select('name location'), Equipment.find({ _id: { $in: eqIds } }).select('name'), User.find({ _id: { $in: vendorIds } }).select('fullName email')]);
        const courtMap = new Map(courts.map(c => [c._id.toString(), c]));
        const eqMap = new Map(equipments.map(e => [e._id.toString(), e]));
        const vendorMap = new Map(vendors.map(v => [v._id.toString(), v]));
        const recordsWithDetails = records.map(r => { const rObj = r.toObject(); if (r.targetType === 'COURT') { const court = courtMap.get(r.targetId.toString()); rObj.targetName = court ? court.name : 'San da xoa'; rObj.targetLocation = court ? court.location : ''; } else { const eq = eqMap.get(r.targetId.toString()); rObj.targetName = eq ? eq.name : 'Thiet bi da xoa'; } if (r.assignedVendorId) { const v = vendorMap.get(r.assignedVendorId.toString()); rObj.assignedVendor = v ? { fullName: v.fullName, email: v.email } : null; } return rObj; });
        return { records: recordsWithDetails, pagination: { totalItems: total, currentPage: parsedPage, totalPages: Math.ceil(total / parsedLimit), limit: parsedLimit } };
    }

    async createMaintenance(adminId, data, files = []) {
        const { targetType, targetId, title, description, severity, subCourtIds } = data;
        if (!targetType || !targetId || !title) throw new Error('Vui long dien day du thong tin!');
        let assignedVendorId = null; let affectedSubCourtIds = [];
        if (targetType.toUpperCase() === 'COURT') {
            const court = await adminRepository.findCourtById(targetId);
            if (!court) throw new Error('Cum san khong ton tai!');
            assignedVendorId = court.vendorId?._id || court.vendorId;
            if (!assignedVendorId) throw new Error('Cum san chua duoc gan chu san!');
            const courtOwner = await User.findOne({ _id: assignedVendorId, role: 'VENDOR', vendorType: 'COURT', status: 'ACTIVE' });
            if (!courtOwner) throw new Error('Chu san khong hop le!');
            const parsedSubCourtIds = Array.isArray(subCourtIds) ? subCourtIds : (typeof subCourtIds === 'string' && subCourtIds ? subCourtIds.split(',').map(s => s.trim()).filter(Boolean) : []);
            if (parsedSubCourtIds.length > 0) { await SubCourt.updateMany({ _id: { $in: parsedSubCourtIds }, courtId: targetId }, { $set: { status: 'MAINTENANCE' } }); affectedSubCourtIds = parsedSubCourtIds; }
            else { const allSubCourts = await adminRepository.findSubCourtsByCourtId(targetId); affectedSubCourtIds = allSubCourts.map(sc => sc._id); await SubCourt.updateMany({ courtId: targetId }, { $set: { status: 'MAINTENANCE' } }); }
        } else if (targetType.toUpperCase() === 'EQUIPMENT') {
            const eq = await adminRepository.findEquipmentById(targetId);
            if (!eq) throw new Error('Thiết bị không tồn tại!');
            assignedVendorId = eq.vendorId || null;
            
            const maintenanceQty = parseInt(data.maintenanceQty) || 1;
            if (isNaN(maintenanceQty) || maintenanceQty <= 0) {
                throw new Error('Số lượng bảo trì phải lớn hơn 0!');
            }
            
            const currentMaintQty = eq.maintenanceQuantity || 0;
            if (eq.availableQuantity - currentMaintQty < maintenanceQty) {
                throw new Error(`Số lượng khả dụng (${eq.availableQuantity - currentMaintQty} chiếc) không đủ để bảo trì ${maintenanceQty} chiếc!`);
            }
            
            // Kiểm tra xung đột với các đơn đặt lịch chưa chơi/chưa hủy
            const activeBookings = await Booking.find({
                status: { $in: ["PENDING", "CONFIRMED", "COMPLETED"] }
            });
            
            const bookingIds = activeBookings.map(b => b._id);
            const activeRentals = await BookingEquipment.find({
                bookingId: { $in: bookingIds },
                equipmentId: eq._id,
                returnStatus: "RENTING"
            });
            
            if (activeRentals.length > 0) {
                for (const rental of activeRentals) {
                    const booking = activeBookings.find(b => b._id.toString() === rental.bookingId.toString());
                    if (!booking) continue;
                    
                    const overlappingBookings = activeBookings.filter(ob => 
                        ob.bookingDate === booking.bookingDate &&
                        ob.startTime < booking.endTime &&
                        ob.endTime > booking.startTime
                    );
                    const overlappingIds = overlappingBookings.map(ob => ob._id.toString());
                    
                    const overlappingRentals = activeRentals.filter(r => 
                        overlappingIds.includes(r.bookingId.toString())
                    );
                    const totalRentedAtSlot = overlappingRentals.reduce((sum, r) => sum + r.quantity, 0);
                    
                    const proposedRemaining = eq.availableQuantity - (currentMaintQty + maintenanceQty);
                    if (totalRentedAtSlot > proposedRemaining) {
                        throw new Error(`Xung đột: Đơn đặt sân #${booking.bookingCode} đã thuê ${totalRentedAtSlot} chiếc thiết bị này vào ngày ${booking.bookingDate} (${booking.startTime}-${booking.endTime}). Nếu bảo trì thêm ${maintenanceQty} chiếc, hệ thống sẽ thiếu thiết bị.`);
                    }
                }
            }
            
            const newMQ = currentMaintQty + maintenanceQty;
            const newDC = (eq.damagedCount || 0) + maintenanceQty;
            const newStatus = (eq.availableQuantity - newMQ <= 0) ? 'DAMAGED' : eq.status;
            await adminRepository.updateEquipment(targetId, { maintenanceQuantity: newMQ, damagedCount: newDC, status: newStatus });
            data.equipmentMaintenanceQty = maintenanceQty;
        }
        const images = (files || []).map(f => ({ imageUrl: f.path, publicId: f.filename }));
        const record = await adminRepository.createMaintenance({ 
            targetType: targetType.toUpperCase(), 
            targetId, 
            affectedSubCourtIds, 
            title: title.trim(), 
            description: description?.trim() || '', 
            images, 
            severity: severity?.toUpperCase() || 'LOW', 
            status: 'REPORTED', 
            maintenanceDate: new Date(), 
            createdBy: adminId, 
            assignedVendorId,
            equipmentMaintenanceQty: data.equipmentMaintenanceQty || 1
        });
        if (assignedVendorId) await notificationService.createForUser({ userId: assignedVendorId, title: 'Yeu cau bao tri moi', message: 'Da duoc tao.', type: 'MAINTENANCE', referenceId: record._id, referenceType: 'Maintenance' });
        return { message: 'Tao yeu cau bao tri thanh cong!', record };
    }

    async getEquipmentRentals(equipmentId) {
        if (!equipmentId) throw new Error("Thiếu mã thiết bị!");
        await bookingService.autoCompletePastBookings();
        const eq = await Equipment.findById(equipmentId);
        if (!eq) throw new Error("Thiết bị không tồn tại!");

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

    async updateMaintenanceStatus() {
        throw new Error('Admin khong duoc phep cap nhat trang thai bao tri!');
    }

    // ======================== ADDITIONAL ADMIN SERVICE METHODS ========================
    async deleteCourtImage(courtId, publicId) {
        const court = await adminRepository.findCourtById(courtId);
        if (!court) throw new Error("Cụm sân không tồn tại!");

        const initialLength = court.images.length;
        court.images = court.images.filter(img => img.publicId !== publicId);

        if (court.images.length === initialLength) {
            throw new Error("Hình ảnh không tồn tại trong cụm sân!");
        }

        await court.save();

        if (publicId) {
            await uploadService.deleteFile(publicId);
        }

        return {
            message: "Xóa hình ảnh sân thành công!",
            court
        };
    }

    async createImportOrder(adminId, data) {
        const { equipmentId, quantity, vendorId } = data;

        if (!equipmentId || !quantity || !vendorId) {
            throw new Error("Vui lòng điền đầy đủ thông tin: Thiết bị, Số lượng, Nhà cung cấp!");
        }

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            throw new Error("Số lượng phải lớn hơn 0!");
        }

        const equipment = await Equipment.findById(equipmentId);
        if (!equipment) {
            throw new Error("Thiết bị không tồn tại!");
        }

        const vendor = await User.findOne({ _id: vendorId, role: "VENDOR" });
        if (!vendor) {
            throw new Error("Nhà cung cấp không tồn tại hoặc không hợp lệ!");
        }

        const newOrder = await ImportOrder.create({
            equipmentId,
            vendorId,
            adminId,
            quantity: qty,
            status: "PENDING"
        });

        await notificationService.createForUser({
            userId: vendorId,
            title: "Yêu cầu nhập kho mới",
            message: `Admin yêu cầu nhập kho ${qty} thiết bị ${equipment.name}.`,
            type: "IMPORT_ORDER",
            referenceId: newOrder._id,
            referenceType: "ImportOrder"
        });

        return {
            message: "Tạo đơn nhập kho thành công! Đang chờ Vendor xác nhận.",
            order: newOrder
        };
    }

    async getImportOrders(queryParams) {
        const { status, limit = 10, page = 1 } = queryParams;

        const parsedLimit = parseInt(limit);
        const parsedPage = parseInt(page);
        const skip = (parsedPage - 1) * parsedLimit;

        const filter = {};
        if (status && ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(status.toUpperCase())) {
            filter.status = status.toUpperCase();
        }

        const [orders, total] = await Promise.all([
            ImportOrder.find(filter)
                .populate("equipmentId", "name type image")
                .populate("vendorId", "fullName email")
                .populate("adminId", "fullName email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parsedLimit),
            ImportOrder.countDocuments(filter)
        ]);

        const ordersWithDelivery = await Promise.all(orders.map(async (order) => {
            const delivery = await Delivery.findOne({ importOrderId: order._id })
                .populate("shipperId", "fullName email phone");
            return {
                ...order.toObject(),
                delivery: delivery ? delivery.toObject() : null
            };
        }));

        return {
            orders: ordersWithDelivery,
            pagination: {
                totalItems: total,
                currentPage: parsedPage,
                totalPages: Math.ceil(total / parsedLimit),
                limit: parsedLimit
            }
        };
    }

    async cancelImportOrder(orderId) {
        const order = await ImportOrder.findById(orderId).populate("equipmentId", "name");
        if (!order) throw new Error("Yêu cầu nhập kho không tồn tại!");
        if (["COMPLETED", "CANCELLED"].includes(order.status)) {
            throw new Error(`Đơn hàng đã kết thúc (Hiện tại: ${order.status})`);
        }
        order.status = "CANCELLED";
        await order.save();

        await Delivery.findOneAndUpdate(
            { importOrderId: order._id },
            { $set: { status: "CANCELLED" } }
        );

        await notificationService.createForUser({
            userId: order.vendorId,
            title: "Đơn nhập kho bị hủy",
            message: `Admin đã hủy yêu cầu nhập kho của thiết bị ${order.equipmentId?.name || ""}.`,
            type: "IMPORT_ORDER",
            referenceId: order._id,
            referenceType: "ImportOrder"
        });

        return {
            message: "Hủy đơn nhập kho thành công!",
            order
        };
    }

    async getSettings() {
        return await systemSettingService.getAllSettings();
    }

    async updateSettings(updates) {
        if (!updates || typeof updates !== "object" || Array.isArray(updates)) throw new Error("Cấu hình không hợp lệ.");
        for (const [key, value] of Object.entries(updates)) systemSettingService.validateSetting(key, value);
        for (const key of Object.keys(updates)) {
            await systemSettingService.updateSetting(key, updates[key]);
        }
        return await systemSettingService.getAllSettings();
    }

    async updateUserRole(userId, data) {
        const { role, vendorType } = data;
        const user = await User.findById(userId);
        if (!user) throw new Error("Người dùng không tồn tại!");

        if (typeof role !== "string" || !role) throw new Error("Thiếu thông tin vai trò (role)!");

        const validRoles = ["USER", "ADMIN", "VENDOR"];
        const updatedRole = role.toUpperCase();
        if (!validRoles.includes(updatedRole)) {
            throw new Error(`Vai trò không hợp lệ: ${role}`);
        }

        const updateData = { role: updatedRole };

        if (updatedRole === "VENDOR") {
            if (typeof vendorType === "string" && vendorType.toUpperCase() === "COURT") {
                updateData.vendorType = vendorType.toUpperCase();
            } else {
                throw new Error("Chỉ hỗ trợ chủ sân với vendorType là COURT. Nhà cung cấp thiết bị đang phát triển.");
            }
        } else {
            updateData.vendorType = null;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select("-password");

        return {
            message: "Cập nhật vai trò người dùng thành công!",
            user: updatedUser
        };
    }
}

export default new AdminService();
