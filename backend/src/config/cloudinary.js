// src/config/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────
// 1. Xác thực tài khoản Cloudinary qua biến môi trường
// ─────────────────────────────────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ─────────────────────────────────────────────────────────────
// CẤU TRÚC FOLDER BÀI BẢN TRÊN CLOUDINARY:
//
// PickleballPro_Media/
// ├── courts/          ← Ảnh cụm sân (Admin + Vendor upload)
// ├── avatars/         ← Ảnh đại diện User
// ├── reviews/         ← Ảnh đính kèm bình luận đánh giá
// ├── maintenance/     ← Ảnh minh chứng yêu cầu bảo trì
// └── delivery_proofs/ ← Ảnh xác nhận giao hàng của Shipper
// ─────────────────────────────────────────────────────────────

// 2a. Storage: Ảnh cụm sân (Admin + Vendor)
const courtStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "PickleballPro_Media/courts",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        // Nén + resize tối ưu cho ảnh trình chiếu sân lớn (màn hình desktop)
        transformation: [
            { width: 1280, height: 854, crop: "limit", quality: "auto:good", fetch_format: "auto" }
        ]
    }
});

// 2b. Storage: Ảnh đại diện User (Avatar)
const avatarStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "PickleballPro_Media/avatars",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        // Ảnh avatar hình vuông nhỏ gọn
        transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto:good", fetch_format: "auto" }
        ]
    }
});

// 2c. Storage: Ảnh đính kèm Review của khách hàng
const reviewStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "PickleballPro_Media/reviews",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        // Ảnh review kích thước vừa phải
        transformation: [
            { width: 800, height: 600, crop: "limit", quality: "auto:eco", fetch_format: "auto" }
        ]
    }
});

// 2d. Storage: Ảnh yêu cầu bảo trì
const maintenanceStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "PickleballPro_Media/maintenance",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [
            { width: 900, height: 675, crop: "limit", quality: "auto:good", fetch_format: "auto" }
        ]
    }
});

// 2d. Storage: Ảnh bằng chứng giao hàng của Shipper
const deliveryProofStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "PickleballPro_Media/delivery_proofs",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        // Ảnh bằng chứng cần đủ rõ để xác minh
        transformation: [
            { width: 900, height: 675, crop: "limit", quality: "auto:good", fetch_format: "auto" }
        ]
    }
});

// ─────────────────────────────────────────────────────────────
// 3. Export các Multer middleware theo từng mục đích sử dụng
// ─────────────────────────────────────────────────────────────

/** Upload ảnh sân — dùng cho Admin & Vendor tạo/sửa cụm sân */
const uploadCourtCloud = multer({
    storage: courtStorage,
    limits: { files: 10, fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        if (!file.mimetype?.startsWith("image/")) return callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
        callback(null, true);
    }
});

export function uploadCourtImages(req, res, next) {
    if (process.env.COURT_IMAGE_STORAGE === "local") {
        const storage = multer.diskStorage({
            destination: (_request, _file, callback) => {
                const directory = path.resolve("uploads", "courts");
                mkdir(directory, { recursive: true }).then(() => callback(null, directory), callback);
            },
            filename: (_request, file, callback) => {
                const extension = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" }[file.mimetype];
                callback(null, `${randomUUID()}${extension}`);
            }
        });
        const localUpload = multer({
            storage,
            limits: { files: 10, fileSize: 10 * 1024 * 1024 },
            fileFilter: (_request, file, callback) => {
                const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
                if (!allowed.has(file.mimetype)) return callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
                callback(null, true);
            }
        });
        return localUpload.array("images", 10)(req, res, error => {
            if (error instanceof multer.MulterError) {
                const tooLarge = error.code === "LIMIT_FILE_SIZE";
                return res.status(400).json({ success: false, code: error.code, message: tooLarge ? "Mỗi ảnh phải nhỏ hơn 10 MB." : "Chỉ nhận tối đa 10 ảnh JPG, PNG hoặc WebP trong trường images." });
            }
            if (error) {
                console.error("[Court image upload] Local storage failed:", error.code || error.name || "unknown");
                return res.status(500).json({ success: false, code: "LOCAL_IMAGE_STORAGE_FAILED", message: "Không thể lưu ảnh sân. Hãy kiểm tra dung lượng và quyền ghi của thư mục lưu ảnh." });
            }
            for (const file of req.files || []) {
                file.path = `/uploads/courts/${file.filename}`;
                file.filename = `local:courts/${file.filename}`;
            }
            return next();
        });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(503).json({ success: false, code: "IMAGE_UPLOAD_NOT_CONFIGURED", message: "Chưa cấu hình Cloudinary. Hãy kiểm tra CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET ở backend/.env." });
    }

    uploadCourtCloud.array("images", 10)(req, res, error => {
        if (!error) return next();
        if (error instanceof multer.MulterError) {
            const tooLarge = error.code === "LIMIT_FILE_SIZE";
            return res.status(400).json({ success: false, code: error.code, message: tooLarge ? "Mỗi ảnh phải nhỏ hơn 10 MB." : "Chỉ nhận tối đa 10 ảnh định dạng hình ảnh trong trường images." });
        }

        const message = String(error.message || error.error?.message || "");
        if (Number(error.http_code) === 401 || /unknown api_key|invalid api_key|api key.*invalid/i.test(message)) {
            console.error("[Court image upload] Cloudinary rejected API credentials.");
            return res.status(503).json({ success: false, code: "CLOUDINARY_AUTH_FAILED", message: "Cloudinary từ chối API key. Hãy kiểm tra CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET trong backend/.env rồi khởi động lại backend." });
        }
        console.error("[Court image upload] Cloudinary upload failed:", error.name || "Error", error.http_code || error.code || "unknown");
        return res.status(502).json({ success: false, code: "CLOUDINARY_UPLOAD_FAILED", message: "Cloudinary không nhận được ảnh. Kiểm tra cấu hình Cloudinary và thử lại." });
    });
}

/** Upload avatar — dùng cho User cập nhật ảnh đại diện */
export const uploadAvatarCloud = multer({ storage: avatarStorage });

/** Upload ảnh review — dùng khi khách gửi đánh giá kèm ảnh */
export const uploadReviewCloud = multer({ storage: reviewStorage });

/** Upload ảnh bảo trì — dùng khi Admin tạo yêu cầu bảo trì */
export const uploadMaintenanceCloud = multer({ storage: maintenanceStorage });

/** Upload bằng chứng giao hàng — dùng cho Shipper xác nhận */
export const uploadDeliveryProofCloud = multer({ storage: deliveryProofStorage });

// Export cloudinary instance để dùng trong uploadService.deleteFile()
export { cloudinary };

