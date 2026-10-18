import User from "../models/user.model.js";

class UserRepository {
    /**
     * Tìm kiếm người dùng dựa vào Email
     */
    async findByEmail(email) {
        return await User.findOne({ email });
    }

    /**
     * Tìm kiếm người dùng dựa vào ID
     */
    async findById(id) {
        return await User.findById(id).select("-password");
    }

    /**
     * Tạo mới một tài khoản người dùng (Dùng cho Register / Google Login)
     */
    async create(userData) {
        return await User.create(userData);
    }

    /**
     * Cập nhật thông tin và lưu lại User
     */
    async updateLastLogin(userInstance) {
        userInstance.lastLogin = new Date();
        return await userInstance.save();
    }

    async update(id, updateData) {
        return await User.findByIdAndUpdate(
            id,
            { $set: updateData },
            { returnDocument: 'after', runValidators: true }
        ).select("-password");
    }


}

export default new UserRepository();