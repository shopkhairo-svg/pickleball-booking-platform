import authService from "../services/auth.service.js";

class AuthController {
    /**
     * Xử lý HTTP Request Đăng nhập thường
     */
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const result = await authService.loginWithPassword({ email, password });

            return res.status(200).json({
                success: true,
                message: "Đăng nhập thành công!",
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                redirectUrl: result.redirectUrl,
                user: {
                    id: result.user._id,
                    fullName: result.user.fullName,
                    email: result.user.email,
                    role: result.user.role,
                    vendorType: result.user.vendorType,
                    maintenanceSkills: result.user.maintenanceSkills,
                    phone: result.user.phone,
                    status: result.user.status,
                    avatar: result.user.avatar
                }
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Xử lý HTTP Request Đăng nhập bằng Google
     */
    async googleLogin(req, res) {
        try {
            const { idToken } = req.body;

            // Gọi sang tầng Service xử lý nghiệp vụ OAuth2
            const result = await authService.loginWithGoogle(idToken);

            // Phản hồi JSON sạch sẽ về cho Frontend React
            return res.status(200).json({
                success: true,
                message: "Đăng nhập bằng Google thành công!",
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                redirectUrl: result.redirectUrl, // URL điều hướng thông minh (/user/profile hoặc /admin/profile)
                user: {
                    id: result.user._id,
                    fullName: result.user.fullName,
                    email: result.user.email,
                    role: result.user.role,
                    vendorType: result.user.vendorType,
                    maintenanceSkills: result.user.maintenanceSkills,
                    phone: result.user.phone,
                    status: result.user.status,
                    avatar: result.user.avatar
                }
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // async register(req, res) {
    //     try {
    //         const { fullName, email, password } = req.body;
    //
    //         // Gọi sang tầng Service xử lý nghiệp vụ tạo tài khoản
    //         const result = await authService.registerWithPassword({ fullName, email, password });
    //
    //         // Phản hồi JSON sạch sẽ về cho Frontend React giống hàm login
    //         return res.status(201).json({
    //             success: true,
    //             message: "Đăng ký tài khoản thành công!",
    //             accessToken: result.accessToken,
    //             refreshToken: result.refreshToken,
    //             redirectUrl: result.redirectUrl,
    //             user: {
    //                 id: result.user._id,
    //                 fullName: result.user.fullName,
    //                 email: result.user.email,
    //                 role: result.user.role,
    //                 avatar: result.user.avatar
    //             }
    //         });
    //     } catch (error) {
    //         return res.status(400).json({
    //             success: false,
    //             message: error.message
    //         });
    //     }
    // }

    // Đăng ký bước 1: Nhận thông tin form -> Gửi OTP
    async register(req, res) {
        try {
            const { fullName, email, password } = req.body;
            await authService.registerStep1({ fullName, email, password });
            return res.status(200).json({
                success: true,
                message: "Mã OTP xác thực đã được gửi vào Email của bạn. Vui lòng kiểm tra!"
            });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    // Đăng ký bước 2: Kiểm tra OTP -> Lưu DB thật
    async verifyOTP(req, res) {
        try {
            const { email, otpCode } = req.body;
            await authService.verifyOTPRegister({ email, otpCode });
            return res.status(201).json({
                success: true,
                message: "Xác minh Email thành công! Tài khoản của bạn đã sẵn sàng hoạt động."
            });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    /**
     * Xử lý HTTP Request Yêu cầu Quên mật khẩu bằng cách gửi OTP
     */
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            await authService.generateForgotPasswordOTP(email);

            return res.status(200).json({
                success: true,
                message: "Mã OTP khôi phục mật khẩu đã được gửi thành công đến email của bạn!"
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || "Có lỗi xảy ra khi xử lý yêu cầu quên mật khẩu!"
            });
        }
    }

    /**
     * Xử lý HTTP Request Đổi mật khẩu mới bằng OTP xác thực
     */
    async resetPassword(req, res) {
        try {
            const { email, otpCode, newPassword } = req.body;

            await authService.resetPasswordWithOTP({ email, otpCode, newPassword });

            return res.status(200).json({
                success: true,
                message: "Mật khẩu của bạn đã được cập nhật mới thành công! Vui lòng đăng nhập lại."
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Xử lý HTTP Request Đăng xuất hệ thống
     */
    async logout(req, res) {
        try {
            const authHeader = req.headers["authorization"];
            const accessToken = authHeader && authHeader.split(" ")[1];
            const userId = req.user?.id;

            await authService.logout({ userId, accessToken });

            return res.status(200).json({
                success: true,
                message: "Đăng xuất tài khoản thành công!"
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Lỗi hệ thống khi đăng xuất!"
            });
        }
    }

    /**
     * Xử lý HTTP Request Làm mới Access Token bằng Refresh Token
     */
    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            const newAccessToken = await authService.refreshAccessToken(refreshToken);

            return res.status(200).json({
                success: true,
                accessToken: newAccessToken
            });
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: error.message || "Refresh token không hợp lệ hoặc đã hết hạn!"
            });
        }
    }
}

export default new AuthController();
