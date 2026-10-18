import Court from "../models/court.model.js";

class CourtRepository {
    /**
     * Truy vấn danh sách sân kèm bộ lọc nâng cao và phân trang
     */
    async findAndCount(filter, skip, limit) {
        // Luôn phòng thủ: Chỉ hiển thị các sân đang AVAILABLE (Sẵn sàng hoạt động)
        const finalFilter = { status: "AVAILABLE", ...filter };

        // Kích hoạt truy vấn song song (Parallel Query) tối ưu tốc độ phản hồi
        const [courts, total] = await Promise.all([
            Court.find(finalFilter)
                .sort({ createdAt: -1 }) // Sân mới nhất lên đầu
                .skip(skip)
                .limit(limit),
            Court.countDocuments(finalFilter)
        ]);

        return { courts, total };
    }

    /**
     * Tìm cụm sân theo ID cụ thể
     */
    async findById(id) {
        return await Court.findById(id);
    }

    async incrementStats(id, increments) {
        return await Court.findByIdAndUpdate(
            id,
            { $inc: increments },
            { new: true }
        );
    }
}

export default new CourtRepository();
