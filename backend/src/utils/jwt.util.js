import jwt from "jsonwebtoken";

class JwtUtils {
    /**
     * Sinh Access Token (Ngắn hạn)
     * @param {Object} payload - Thông tin đóng gói vào token (id, role)
     */
    generateAccessToken(payload) {
        return jwt.sign(
            payload,
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRATION }
        );
    }

    /**
     * Sinh Refresh Token (Dài hạn)
     * @param {Object} payload - Thường chỉ cần đóng gói userId
     */
    generateRefreshToken(payload) {
        return jwt.sign(
            payload,
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRATION }
        );
    }

    /**
     * Xác thực và giải mã Access Token
     * @param {String} token
     */
    verifyAccessToken(token) {
        return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    }

    /**
     * Xác thực và giải mã Refresh Token
     * @param {String} token
     */
    verifyRefreshToken(token) {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    }
}

export default new JwtUtils();