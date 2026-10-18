import courtRepository from "../repositories/court.repository.js";
import SubCourt from "../models/subCourt.model.js";
import CourtSlot from "../models/courtSlot.model.js";

class CourtService {
    /**
     * Logic nghiệp vụ xử lý bộ lọc nâng cao cho trang chủ & trang danh sách
     */
    async getCourtsListing(queryParams) {
        const { type, location, minPrice, maxPrice, search, limit = 6, page = 1 } = queryParams;

        const parsedLimit = parseInt(limit);
        const parsedPage = parseInt(page);
        const skip = (parsedPage - 1) * parsedLimit;

        // Khởi tạo Object bộ lọc động
        const filter = {};

        // 1. Bộ lọc Loại sân (INDOOR / OUTDOOR)
        if (type && ["INDOOR", "OUTDOOR"].includes(type.toUpperCase())) {
            filter.type = type.toUpperCase();
        }

        // 2. Bộ lọc Khu vực (Tìm kiếm regex tương đối không phân biệt hoa thường)
        if (location) {
            filter.location = { $regex: location, $options: "i" };
        }

        // 3. Thuật toán tìm kiếm văn bản thông minh (Tên sân hoặc mô tả)
        if (search) {
            filter.$text = { $search: search };
        }

        // 4. Bộ lọc Khoảng giá tiền mỗi giờ
        if (minPrice || maxPrice) {
            filter.pricePerHour = {};
            if (minPrice) filter.pricePerHour.$gte = parseInt(minPrice);
            if (maxPrice) filter.pricePerHour.$lte = parseInt(maxPrice);
        }

        // Gọi Repository thực thi bốc dữ liệu
        const { courts, total } = await courtRepository.findAndCount(filter, skip, parsedLimit);

        return {
            courts,
            pagination: {
                totalItems: total,
                currentPage: parsedPage,
                totalPages: Math.ceil(total / parsedLimit),
                limit: parsedLimit
            }
        };
    }

    /**
     * Logic nghiệp vụ lấy thông tin chi tiết một cụm sân
     */
    async getCourtDetail(courtId, dateQuery) {
        if (!courtId) throw new Error("Thiếu thông tin mã ID cụm sân!");

        // 1. Lấy thông tin cơ bản của cụm sân lớn
        const court = await courtRepository.findById(courtId);
        if (!court || court.status === "HIDDEN") {
            throw new Error("Cụm sân này không tồn tại hoặc đã bị tạm ẩn!");
        }

        const targetDate = dateQuery || new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

        // 2. Lấy danh sách tất cả các sân nhỏ thuộc cụm này (bao gồm cả sân đang bảo trì, chỉ ẩn sân HIDDEN)
        const subCourts = await SubCourt.find({ courtId, status: { $ne: "HIDDEN" } });

        // 3. Lấy tất cả các ô giờ đã tạo của cụm này trong ngày được chọn
        const slots = await CourtSlot.find({ courtId, date: targetDate });

        const nowStr = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

        // 🎯 THUẬT TOÁN ĐỒNG BỘ: Gom nhóm (Group) các ô giờ thật lồng vào từng Sân nhỏ tương ứng
        const timelineMatrix = subCourts.map(sub => {
            // Lọc ra các slot thuộc về cái sân nhỏ này
            const subCourtSlots = slots
                .filter(slot => slot.subCourtId.toString() === sub._id.toString())
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map(slot => {
                    const slotObj = slot.toObject();
                    const slotDateTimeStr = `${slot.date} ${slot.startTime}:00`;
                    if (slotDateTimeStr < nowStr) {
                        slotObj.isPast = true; // Đánh dấu ô giờ đã trôi qua
                    }
                    if (sub.status === "MAINTENANCE") {
                        slotObj.isMaintenance = true; // Đánh dấu ô giờ đang bảo trì
                    }
                    return slotObj;
                });

            return {
                _id: sub._id,
                name: sub.name,
                status: sub.status,
                slots: subCourtSlots // Mảng các ô giờ thật chạy theo thời gian thực!
            };
        });

        return {
            court,
            targetDate,
            subCourtsTimeline: timelineMatrix
        };
    }
}

export default new CourtService();