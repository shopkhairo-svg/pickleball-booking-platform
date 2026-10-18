// src/services/auth.service.js
import userRepository from "../repositories/user.repository.js";
import bcrypt from "bcryptjs";
import redisClient from "../config/redis.js";
// Import file tiện ích vừa tách
import jwtUtil from "../utils/jwt.util.js";
import googleAuthUtil from "../utils/googleAuth.util.js";
import mailUtil from "../utils/mail.util.js";

class AuthService {
    debugLogin(stage, payload) {
        if (process.env.AUTH_DEBUG_LOGIN !== "true") return;
        console.log("[AUTH_DEBUG_LOGIN]", stage, payload);
    }

    getRedirectUrl(user) {
        if (user.role === "ADMIN") return "/admin";
        if (user.role === "VENDOR") return "/vendor";
        if (user.role === "SHIPPER") return "/shipper";
        if (user.role === "MAINTENANCE_STAFF") return "/maintenance-staff";
        return "/";
    }

    /**
     * Logic Đăng nhập hệ thống bằng Email & Mật khẩu
     */
    async loginWithPassword({ email, password }) {
        const user = await userRepository.findByEmail(email);
        this.debugLogin("lookup", {
            email,
            found: Boolean(user),
            role: user?.role,
            vendorType: user?.vendorType,
            status: user?.status
        });
        if (!user) throw new Error("Email hoặc mật khẩu không chính xác!");

        if (user.status === "BLOCKED") throw new Error("Tài khoản của bạn hiện đang bị khóa!");

        const isMatch = await bcrypt.compare(password, user.password);
        this.debugLogin("password_compare", { email, match: isMatch });
        if (!isMatch) throw new Error("Email hoặc mật khẩu không chính xác!");

        // Sử dụng JwtUtils để sinh bộ đôi token sạch sẽ
        const accessToken = jwtUtil.generateAccessToken({ id: user._id, role: user.role });
        const refreshToken = jwtUtil.generateRefreshToken({ id: user._id });

        // Lưu whitelist trên Redis
        await redisClient.set(`refresh:${user._id}`, refreshToken, "EX", 7 * 24 * 60 * 60);

        await userRepository.updateLastLogin(user);
        const redirectUrl = this.getRedirectUrl(user);
        this.debugLogin("success", { email, role: user.role, vendorType: user.vendorType, redirectUrl });

        return { accessToken, refreshToken, redirectUrl, user };
    }

    /**
     * Logic Đăng nhập bằng tài khoản Google (OAuth2)
     */
    async loginWithGoogle(idToken) {
        if (!idToken) throw new Error("Thiếu Google ID Token!");

        // 1. Xác thực và lấy thông tin User thông qua lớp tiện ích vừa tách
        const payload = await googleAuthUtil.verifyGoogleToken(idToken);
        const { email, name, picture } = payload;

        // 2. Truy tìm tài khoản trong Database
        let user = await userRepository.findByEmail(email);

        // 3. Nếu chưa tồn tại tài khoản -> Tự động tạo mới (Đăng ký tự động)
        if (!user) {
            const dummyPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
            user = await userRepository.create({
                fullName: name,
                email,
                password: dummyPassword, // Thỏa mãn điều kiện Schema
                avatar: picture || null,
                role: "USER", //
                status: "ACTIVE" //
            });
        }

        // 4. Kiểm tra xem trạng thái tài khoản có bị khóa không
        if (user.status === "BLOCKED") { //
            throw new Error("Tài khoản Google này đã bị khóa khỏi hệ thống!");
        }

        // 5. Khởi tạo mã bộ đôi Token hệ thống qua JwtUtils
        const accessToken = jwtUtil.generateAccessToken({ id: user._id, role: user.role });
        const refreshToken = jwtUtil.generateRefreshToken({ id: user._id });

        // 6. Lưu phiên vào Redis Whitelist
        await redisClient.set(`refresh:${user._id}`, refreshToken, "EX", 7 * 24 * 60 * 60);

        // 7. Lưu lịch sử login và trả về kết quả
        await userRepository.updateLastLogin(user); //
        const redirectUrl = this.getRedirectUrl(user);

        return { accessToken, refreshToken, redirectUrl, user };
    }

    /**
     * Logic cấp lại Access Token mới từ Refresh Token
     */
    async refreshAccessToken(tokenFromClient) {
        if (!tokenFromClient) throw new Error("Thiếu Refresh Token!");

        // Sử dụng JwtUtils để giải mã token thay vì viết jwt.verify thủ công
        const decoded = jwtUtil.verifyRefreshToken(tokenFromClient);
        const savedToken = await redisClient.get(`refresh:${decoded.id}`);

        if (!savedToken || savedToken !== tokenFromClient) {
            throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!");
        }

        const user = await userRepository.findById(decoded.id);
        if (!user || user.status === "BLOCKED") throw new Error("Tài khoản không hợp lệ!");

        // Ký cấp Access Token mới thông qua tiện ích
        const newAccessToken = jwtUtil.generateAccessToken({ id: user._id, role: user.role });
        return newAccessToken;
    }

    /**
     * Xử lý HTTP Request Đăng ký tài khoản thường
     */
    // async registerWithPassword({ fullName, email, password }) {
    //     // 1. Kiểm tra xem Email đã tồn tại trong hệ thống chưa
    //     const existingUser = await userRepository.findByEmail(email);
    //     if (existingUser) throw new Error("Địa chỉ Email này đã được đăng ký trên hệ thống!");
    //
    //     // 2. Mã hóa mật khẩu bảo mật sử dụng bcryptjs giống file seed
    //     const hashedPassword = await bcrypt.hash(password, 10);
    //
    //     // 3. Tiến hành tạo tài khoản mới lưu vào Database thông qua Repository
    //     const user = await userRepository.create({
    //         fullName,
    //         email,
    //         password: hashedPassword,
    //         role: "USER",     // Mặc định role USER theo Schema của bạn
    //         status: "ACTIVE"  // Trạng thái hoạt động ngay lập tức
    //     });
    //
    //     // 4. Khởi tạo mã bộ đôi Token hệ thống qua JwtUtils
    //     const accessToken = jwtUtil.generateAccessToken({ id: user._id, role: user.role });
    //     const refreshToken = jwtUtil.generateRefreshToken({ id: user._id });
    //
    //     // 5. Lưu phiên vào Redis Whitelist (Hết hạn sau 7 ngày giống luồng Login)
    //     await redisClient.set(`refresh:${user._id}`, refreshToken, "EX", 7 * 24 * 60 * 60);
    //
    //     // 6. Cập nhật lịch sử đăng nhập cuối cùng
    //     await userRepository.updateLastLogin(user);
    //     const redirectUrl = "/login";
    //
    //     return { accessToken, refreshToken, redirectUrl, user };
    // }

    async registerStep1({ fullName, email, password }) {
        // 1. Check xem email đã được ai đăng ký chính thức chưa
        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            throw new Error("Email này đã được sử dụng trên hệ thống!");
        }

        // 2. Sinh mã OTP ngẫu nhiên 6 chữ số
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // 3. Mã hóa mật khẩu ngay từ bước này luôn cho an toàn
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Gom dữ liệu lại lưu tạm vào Redis với thời hạn 5 phút (300 giây)
        const redisKey = `pending-register:${email}`;
        const registerPayload = {
            fullName,
            email,
            password: hashedPassword,
            otp
        };

        await redisClient.set(redisKey, JSON.stringify(registerPayload), "EX", 5 * 60);

        // 5. Bắn mail OTP cho khách (Hàm gửi mail bạn tự viết trong mailUtil nhé)
        await mailUtil.sendOTPEmail(email, fullName, otp);

        return true;
    }

    async verifyOTPRegister({ email, otpCode }) {
        const redisKey = `pending-register:${email}`;
        const rawData = await redisClient.get(redisKey);

        // 1. Kiểm tra OTP có bị quá hạn 5 phút không
        if (!rawData) {
            throw new Error("Mã OTP đã hết hạn hoặc yêu cầu đăng ký không tồn tại. Vui lòng đăng ký lại!");
        }

        const registerData = JSON.parse(rawData);

        // 2. Đối chiếu mã OTP xem có khớp không
        if (registerData.otp !== otpCode) {
            throw new Error("Mã OTP nhập vào không chính xác!");
        }

        // 3. OTP khớp chuẩn đét -> Tạo tài khoản chính thức vào MongoDB
        const newUser = await userRepository.create({
            fullName: registerData.fullName,
            email: registerData.email,
            password: registerData.password,
            status: "ACTIVE"
        });

        // 4. Dọn rác sạch sẽ trên Redis
        await redisClient.del(redisKey);

        return newUser;
    }

    /**
     * Logic Tạo mã OTP khôi phục mật khẩu và gửi EMAIL cho khách hàng
     */
    async generateForgotPasswordOTP(email) {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new Error("Địa chỉ email không tồn tại trên hệ thống!");
        }
        if (user.status === "BLOCKED") {
            throw new Error("Tài khoản của bạn đã bị khóa khỏi hệ thống!");
        }

        // Kiểm tra giới hạn gửi OTP (tối đa 3 lần trong 15 phút)
        const countKey = `forgot-password-count:${email}`;
        const countRaw = await redisClient.get(countKey);
        const count = countRaw ? parseInt(countRaw, 10) : 0;

        if (count >= 3) {
            throw new Error("Bạn đã vượt quá số lần gửi OTP cho phép. Vui lòng thử lại sau 15 phút!");
        }

        // Sinh mã OTP ngẫu nhiên 6 chữ số
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Lưu OTP vào Redis trong vòng 5 phút (300 giây)
        const otpKey = `forgot-password-otp:${email}`;
        await redisClient.set(otpKey, otp, "EX", 5 * 60);

        // Cập nhật số lần gửi OTP trong Redis
        if (count === 0) {
            await redisClient.set(countKey, 1, "EX", 15 * 60);
        } else {
            await redisClient.incr(countKey);
        }

        // Gửi email OTP
        await mailUtil.sendForgotPasswordOTPEmail(email, user.fullName, otp);

        return true;
    }

    /**
     * Logic Xác thực mã OTP và cập nhật mật khẩu mới vào Database
     */
    async resetPasswordWithOTP({ email, otpCode, newPassword }) {
        const otpKey = `forgot-password-otp:${email}`;
        const savedOtp = await redisClient.get(otpKey);

        if (!savedOtp) {
            throw new Error("Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu lại mã mới!");
        }

        if (savedOtp !== otpCode) {
            throw new Error("Mã OTP nhập vào không chính xác!");
        }

        const user = await userRepository.findByEmail(email);
        if (!user || user.status === "BLOCKED") {
            throw new Error("Tài khoản không hợp lệ hoặc đã bị khóa khỏi hệ thống!");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        // Xóa OTP khỏi Redis sau khi sử dụng thành công (chỉ dùng 1 lần)
        await redisClient.del(otpKey);

        return true;
    }

    /**
     * Logic Đăng xuất - Xóa whitelist Refresh Token và đưa Access Token cũ vào Blacklist của Redis
     */
    async logout({ userId, accessToken }) {
        if (userId) {
            await redisClient.del(`refresh:${userId}`);
        }
        if (accessToken) {
            // Đưa Access Token cũ vào danh sách đen trong vòng 15 phút (bằng thời gian sống của nó)
            await redisClient.set(`blacklist:${accessToken}`, "true", "EX", 15 * 60);
        }
        return true;
    }
}

export default new AuthService();
