// src/services/upload.service.js
import { cloudinary } from "../config/cloudinary.js";
import { unlink } from "node:fs/promises";
import path from "node:path";

class UploadService {
    /**
     * Xử lý file đơn lẻ (Ví dụ: Upload 1 ảnh đại diện Avatar)
     */
    async uploadSingleFile(file) {
        if (!file) throw new Error("Không có tệp tin nào được tải lên!");
        return {
            imageUrl: file.path, // Đường dẫn URL an toàn dạng https bốc từ Cloudinary
            publicId: file.filename // Mã định danh của ảnh để sau này phục vụ lệnh xóa
        };
    }

    /**
     * Xử lý danh sách nhiều ảnh cùng lúc (Ví dụ: Upload mảng ảnh Bento của cụm sân)
     */
    async uploadMultipleFiles(files) {
        if (!files || files.length === 0) throw new Error("Danh sách tệp tin trống!");

        return files.map(file => ({
            imageUrl: file.path,
            publicId: file.filename
        }));
    }

    /**
     * Thuật toán xóa ảnh khỏi Cloudinary để dọn sạch bộ nhớ mây khi Admin hủy ảnh sân
     */
    async deleteFile(publicId) {
        if (!publicId) return;
        if (publicId.startsWith("local:courts/")) {
            const filename = path.basename(publicId.slice("local:courts/".length));
            if (!filename || filename === "." || filename === "..") return;
            try { await unlink(path.resolve("uploads", "courts", filename)); }
            catch (error) { if (error.code !== "ENOENT") throw error; }
            return { result: "ok" };
        }
        return await cloudinary.uploader.destroy(publicId);
    }
}

export default new UploadService();
