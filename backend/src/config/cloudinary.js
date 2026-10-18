// src/config/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
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
export const uploadCourtCloud = multer({ storage: courtStorage });

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

