// src/services/court.service.js (Môi trường Frontend React)
import axiosClient from "../api/axios";

export const courtService = {
    /**
     * 🏟️ Lấy danh sách cụm sân kèm bộ lọc (type, location, minPrice, maxPrice, search, page)
     * Nhờ Interceptor lột vỏ sẵn nên hàm này trả về thẳng Object dữ liệu sạch từ BE
     */
    getCourts: async (params = {}) => {
        return await axiosClient.get("/courts", { params });
    },

    /**
     * 🔍 Lấy thông tin chi tiết một cụm sân dựa vào ID
     */
    getCourtDetail: async (id, date) => {
        return await axiosClient.get(`/courts/${id}`, { params: { date } });
    }
};