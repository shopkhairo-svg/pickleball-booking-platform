import userService from "../services/user.service.js";

class UserController {
    /**
     * API: GET /api/users/profile
     */
    async getProfile(req, res) {
        try {
            const userId = req.user.id; // Bốc từ verifyToken
            const user = await userService.getUserProfile(userId);

            return res.status(200).json({
                success: true,
                user
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * API: PUT /api/users/profile
     */
    async updateProfile(req, res) {
        try {
            const userId = req.user.id;
            // req.file chứa ảnh do middleware uploadCloud xử lý
            const result = await userService.updateUserProfile(userId, req.body, req.file);

            return res.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default new UserController();
