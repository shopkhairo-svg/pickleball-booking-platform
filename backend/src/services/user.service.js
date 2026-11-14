import userRepository from "../repositories/user.repository.js";

class UserService {
    /**
     * Lấy profile sạch (Không kèm password)
     */
    async getUserProfile(userId) {
        const user = await userRepository.findById(userId);
        if (!user) throw new Error("Người dùng không tồn tại trên hệ thống!");
        if (user.status === "BLOCKED") throw new Error("Tài khoản của bạn đã bị khóa!");
        return user;
    }

    /**
     * Cập nhật thông tin profile + Xử lý Avatar Cloudinary
     */
    async updateUserProfile(userId, updatePayload, file) {
        const { fullName, phone } = updatePayload;
        const updateData = {};

        if (fullName !== undefined) {
            if (typeof fullName !== "string" || fullName.trim().length < 2 || fullName.trim().length > 100) {
                throw new Error("Họ và tên phải có từ 2 đến 100 ký tự!");
            }
            updateData.fullName = fullName.trim();
        }

        if (phone !== undefined) {
            if (phone !== null && typeof phone !== "string") throw new Error("Số điện thoại không hợp lệ!");
            if (phone && !/^[+\d\s().-]{7,20}$/.test(phone.trim())) throw new Error("Số điện thoại không hợp lệ!");
            updateData.phone = phone?.trim() || null;
        }

        // 🎯 NẾU CÓ FILE ẢNH ĐƯỢC TẢI LÊN: Multer Storage đã đẩy lên mây và găm link vào file.path
        if (file) {
            updateData.avatar = file.path; // Lấy link https của Cloudinary lưu vào trường avatar
        }

        const updatedUser = await userRepository.update(userId, updateData);
        if (!updatedUser) throw new Error("Không thể cập nhật thông tin người dùng!");

        return {
            message: "Cập nhật hồ sơ cá nhân thành công rực rỡ!",
            user: updatedUser
        };
    }
}

export default new UserService();
