import { body, param, query, validationResult } from "express-validator";

/**
 * 1. Mảng định nghĩa quy tắc kiểm tra (Validation Rules) dành riêng cho cổng Đăng nhập
 */
export const loginValidator = [
    body("email")
        .notEmpty().withMessage("Email không được để trống!")
        .isEmail().withMessage("Email không đúng định dạng tài khoản hợp lệ!")
        .trim()
        .toLowerCase(),

    body("password")
        .notEmpty().withMessage("Mật khẩu nhập vào không được để trống!")
        .isLength({ min: 6 }).withMessage("Mật khẩu bắt buộc phải có độ dài từ 6 ký tự trở lên!")
];

/**
 * 2. Middleware trung gian tiến hành quét và trích xuất kết quả kiểm tra lỗi dữ liệu
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    // Nếu mảng chứa danh sách lỗi kiểm tra không rỗng
    if (!errors.isEmpty()) {
        // Trích xuất thông báo lỗi đầu tiên xuất hiện để trả về giao diện hiển thị cho người dùng
        const firstErrorMessage = errors.array()[0].msg;

        return res.status(400).json({
            success: false,
            message: firstErrorMessage,
            errors: errors.array() // Trả thêm mảng full chi tiết lỗi nếu Frontend cần map vào từng ô Input
        });
    }

    // Nếu dữ liệu đầu vào sạch và hoàn toàn hợp lệ, cho phép đi tiếp vào controller
    next();
};
/**
 * 3. Quy tắc kiểm tra dữ liệu đầu vào cho cổng Đăng ký (Register)
 */
export const registerValidator = [
    body("fullName")
        .notEmpty().withMessage("Họ và tên không được để trống!")
        .isLength({ min: 2, max: 100 }).withMessage("Họ và tên phải từ 2 đến 100 ký tự!"),

    body("email")
        .notEmpty().withMessage("Email không được để trống!")
        .isEmail().withMessage("Email không đúng định dạng hợp lệ!")
        .trim()
        .toLowerCase(),

    body("password")
        .notEmpty().withMessage("Mật khẩu không được để trống!")
        .isLength({ min: 6 }).withMessage("Mật khẩu bắt buộc phải từ 6 ký tự trở lên!")
];

/**
 * 4. Quy tắc kiểm tra dữ liệu cho cổng Quên mật khẩu (Forgot Password)
 */
export const forgotPasswordValidator = [
    body("email")
        .notEmpty().withMessage("Vui lòng nhập địa chỉ Email của bạn!")
        .isEmail().withMessage("Địa chỉ Email không đúng định dạng hợp lệ!")
        .trim()
        .toLowerCase()
];
/**
 * 5. Quy tắc kiểm tra dữ liệu đầu vào cho cổng Đổi mật khẩu mới (Reset Password)
 */
export const resetPasswordValidator = [
    body("email")
        .notEmpty().withMessage("Email không được để trống!")
        .isEmail().withMessage("Email không đúng định dạng hợp lệ!")
        .trim()
        .toLowerCase(),

    body("otpCode")
        .notEmpty().withMessage("Vui lòng nhập mã OTP xác thực!")
        .isLength({ min: 6, max: 6 }).withMessage("Mã OTP bắt buộc phải gồm 6 chữ số!"),

    body("newPassword")
        .notEmpty().withMessage("Mật khẩu mới không được để trống!")
        .isLength({ min: 6 }).withMessage("Mật khẩu mới bắt buộc phải từ 6 ký tự trở lên!")
];

export const objectIdParamValidator = (field = "id") => [
    param(field).isMongoId().withMessage("Mã định danh không hợp lệ!")
];

export const createReviewValidator = [
    body("courtId").isMongoId().withMessage("Mã sân không hợp lệ!"),
    body("bookingId").isMongoId().withMessage("Mã booking không hợp lệ!"),
    body("rating")
        .isInt({ min: 1, max: 5 })
        .withMessage("Số sao đánh giá phải từ 1 đến 5!"),
    body("comment")
        .optional({ checkFalsy: true })
        .isLength({ max: 1500 })
        .withMessage("Bình luận tối đa 1500 ký tự!"),
    body("images")
        .optional()
        .isArray()
        .withMessage("Danh sách ảnh đánh giá không hợp lệ!")
];

export const reviewStatusValidator = [
    body("status")
        .isIn(["PENDING", "APPROVED", "HIDDEN", "DELETED"])
        .withMessage("Trạng thái đánh giá không hợp lệ!")
];

export const validateCouponValidator = [
    body("code").notEmpty().withMessage("Vui lòng nhập mã giảm giá!"),
    body("orderValue")
        .isFloat({ min: 0 })
        .withMessage("Giá trị đơn hàng không hợp lệ!"),
    body("courtId")
        .optional({ checkFalsy: true })
        .isMongoId()
        .withMessage("Mã sân không hợp lệ!")
];

export const couponAdminValidator = [
    body("code").notEmpty().withMessage("Mã giảm giá không được để trống!"),
    body("name").notEmpty().withMessage("Tên mã giảm giá không được để trống!"),
    body("discountType")
        .isIn(["PERCENT", "FIXED"])
        .withMessage("Loại giảm giá không hợp lệ!"),
    body("discountValue")
        .isFloat({ min: 0 })
        .withMessage("Giá trị giảm không hợp lệ!"),
    body("minOrderValue")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Giá trị đơn tối thiểu không hợp lệ!"),
    body("startDate")
        .isISO8601()
        .withMessage("Ngày bắt đầu không hợp lệ!"),
    body("endDate")
        .isISO8601()
        .withMessage("Ngày kết thúc không hợp lệ!")
];

export const bookingCreateValidator = [
    body("slotId").isMongoId().withMessage("Vui lòng chọn đúng ô giờ đặt sân!"),
    body("couponCode")
        .optional({ checkFalsy: true })
        .isLength({ max: 40 })
        .withMessage("Mã giảm giá tối đa 40 ký tự!"),
    body("pointsToUse")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Số điểm sử dụng không hợp lệ!"),
    body("equipments")
        .optional()
        .isArray()
        .withMessage("Danh sách thiết bị không hợp lệ!")
];

export const recentViewQueryValidator = [
    query("guestId").optional({ checkFalsy: true }).isLength({ max: 100 }).withMessage("Guest ID không hợp lệ!")
];
