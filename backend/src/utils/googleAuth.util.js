// src/utils/googleAuth.util.js
import { OAuth2Client } from "google-auth-library";
import { getGoogleClientId } from "../config/authConfig.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class GoogleAuthUtils {
    /**
     * Xác thực Google ID Token và trích xuất thông tin người dùng
     * @param {String} idToken - Token nhận được từ Frontend React
     * @returns {Object} Payload chứa thông tin cá nhân từ Google (email, name, picture)
     */
    async verifyGoogleToken(idToken) {
        const clientId = getGoogleClientId();
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: clientId
            });

            const payload = ticket.getPayload();
            if (!payload?.email || payload.email_verified !== true) {
                throw new Error("Google email is not verified");
            }
            return payload;
        } catch (error) {
            throw new Error("Mã Google ID Token không hợp lệ hoặc đã hết hạn!");
        }
    }
}

export default new GoogleAuthUtils();
