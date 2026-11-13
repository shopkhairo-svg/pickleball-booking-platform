// src/utils/mail.util.js
import nodemailer from "nodemailer";
import { getSmtpOptions } from "../config/authConfig.js";

class MailUtils {
    async sendBookingReminder(booking) {
        return this.transporter.sendMail({
            from: `"PickleballPro" <${process.env.MAIL_USER}>`,
            to: booking.userId.email,
            subject: `[PickleballPro] Sắp đến giờ chơi — ${booking.bookingCode}`,
            text: `Xin chào ${booking.userId.fullName || "bạn"},\n\nLịch đặt sân của bạn sẽ bắt đầu trong vòng 30 phút.\nMã đơn: ${booking.bookingCode}\nSân: ${booking.courtId?.name || ""}\nĐịa chỉ: ${booking.courtId?.address || booking.courtId?.location || ""}\nNgày: ${booking.bookingDate}\nGiờ: ${booking.startTime}–${booking.endTime} (giờ Việt Nam)\n\nVui lòng đến sân đúng giờ. Chúc bạn có buổi chơi vui vẻ!`
        });
    }
    get transporter() {
        // Validate lazily so missing SMTP does not break password login.
        return nodemailer.createTransport(getSmtpOptions());
    }

    assertConfigured() {
        getSmtpOptions();
    }

    /**
     * Hàm gửi email khôi phục mật khẩu
     */
    async sendResetPasswordEmail(toEmail, fullName, resetLink) {
        const mailOptions = {
            from: `"PickleballPro Support" <${process.env.MAIL_USER}>`,
            to: toEmail,
            subject: "🔒 [PickleballPro] Yêu cầu khôi phục mật khẩu tài khoản",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #bccbb9; border-radius: 16px; background-color: #f3fcef;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #006e2f; margin: 0; font-size: 24px; font-weight: 900;">PickleballPro</h1>
                    </div>
                    <div style="background-color: #ffffff; padding: 24px; border-radius: 16px;">
                        <p style="font-size: 16px; color: #161d16; margin-top: 0;">Xin chào <b>${fullName}</b>,</p>
                        <p style="font-size: 14px; color: #3d4a3d; line-height: 1.5;">
                            Hệ thống đã nhận được yêu cầu thiết lập lại mật khẩu cho tài khoản của bạn. Vui lòng bấm vào nút hành động bên dưới để tiến hành đổi mật khẩu mới:
                        </p>
                        <div style="text-align: center; margin: 25px 0;">
                            <a href="${resetLink}" target="_blank" style="background-color: #006e2f; color: #ffffff; font-weight: bold; padding: 12px 30px; text-decoration: none; border-radius: 9999px; font-size: 14px; display: inline-block;">
                                Đặt lại mật khẩu
                            </a>
                        </div>
                        <p style="font-size: 12px; color: #ba1a1a; background-color: #ffdad6; padding: 10px; border-radius: 8px;">
                            ⚠️ Liên kết này chỉ có hiệu lực trong vòng 15 phút.
                        </p>
                    </div>
                </div>
            `,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✉️ Email đã gửi thành công tới: ${toEmail} - ID: ${info.messageId}`);
            return true;
        } catch (error) {
            console.error("❌ Lỗi nghiêm trọng tại lớp MailUtils:", error);
            throw new Error("Không thể gửi email khôi phục vào lúc này!");
        }
    }
    /**
     * 🎯 THÊM MỚI: Hàm gửi mã OTP kích hoạt tài khoản đăng ký
     */
    async sendOTPEmail(toEmail, fullName, otp) {
        const mailOptions = {
            from: `"PickleballPro Verification" <${process.env.MAIL_USER}>`,
            to: toEmail,
            subject: "🔒 [PickleballPro] Mã OTP Xác Thực Kích Hoạt Tài Khoản",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #bccbb9; border-radius: 16px; background-color: #f3fcef;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #006e2f; margin: 0; font-size: 24px; font-weight: 900;">PickleballPro</h1>
                    </div>
                    <div style="background-color: #ffffff; padding: 24px; border-radius: 16px;">
                        <p style="font-size: 16px; color: #161d16; margin-top: 0;">Xin chào <b>${fullName}</b>,</p>
                        <p style="font-size: 14px; color: #3d4a3d; line-height: 1.5;">
                            Cảm ơn bạn đã đăng ký thành viên tại hệ thống <b>PickleballPro</b>. Để hoàn tất thủ tục xác minh Email chính chủ, vui lòng nhập mã OTP gồm 6 chữ số dưới đây vào giao diện ứng dụng:
                        </p>
                        
                        <div style="text-align: center; margin: 25px 0; background-color: #f3fcef; padding: 15px; border-radius: 12px;">
                            <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #006e2f;">${otp}</span>
                        </div>
                        
                        <p style="font-size: 12px; color: #ba1a1a; background-color: #ffdad6; padding: 10px; border-radius: 8px;">
                            ⚠️ Mã xác thực này có hiệu lực trong vòng 5 phút và chỉ sử dụng được 1 lần duy nhất. Tuyệt đối không chia sẻ mã này cho bất kỳ ai!
                        </p>
                    </div>
                </div>
            `,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✉️ OTP Đăng ký đã gửi thành công tới: ${toEmail} - ID: ${info.messageId}`);
            return true;
        } catch (error) {
            if (error.status === 503) throw error;
            console.error("❌ Lỗi gửi OTP tại lớp MailUtils:", error);
            throw Object.assign(new Error("Không thể gửi email OTP. Vui lòng thử lại sau hoặc liên hệ quản trị viên."), { status: 503 });
        }
    }

    /**
     * Hàm gửi OTP khôi phục mật khẩu quên
     */
    async sendForgotPasswordOTPEmail(toEmail, fullName, otp) {
        const mailOptions = {
            from: `"PickleballPro Support" <${process.env.MAIL_USER}>`,
            to: toEmail,
            subject: "🔒 [PickleballPro] Mã OTP Khôi Phục Mật Khẩu",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #bccbb9; border-radius: 16px; background-color: #f3fcef;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #006e2f; margin: 0; font-size: 24px; font-weight: 900;">PickleballPro</h1>
                    </div>
                    <div style="background-color: #ffffff; padding: 24px; border-radius: 16px;">
                        <p style="font-size: 16px; color: #161d16; margin-top: 0;">Xin chào <b>${fullName}</b>,</p>
                        <p style="font-size: 14px; color: #3d4a3d; line-height: 1.5;">
                            Chúng tôi nhận được yêu cầu khôi phục mật khẩu từ tài khoản của bạn. Để đặt lại mật khẩu mới, vui lòng nhập mã OTP gồm 6 chữ số dưới đây:
                        </p>
                        
                        <div style="text-align: center; margin: 25px 0; background-color: #f3fcef; padding: 15px; border-radius: 12px;">
                            <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #006e2f;">${otp}</span>
                        </div>
                        
                        <p style="font-size: 12px; color: #ba1a1a; background-color: #ffdad6; padding: 10px; border-radius: 8px;">
                            ⚠️ Mã OTP này chỉ có hiệu lực trong vòng 5 phút và chỉ sử dụng được 1 lần duy nhất. Tuyệt đối không chia sẻ mã này cho bất kỳ ai!
                        </p>
                    </div>
                </div>
            `,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✉️ OTP Khôi phục mật khẩu đã gửi thành công tới: ${toEmail} - ID: ${info.messageId}`);
            return true;
        } catch (error) {
            if (error.status === 503) throw error;
            console.error("❌ Lỗi gửi OTP khôi phục mật khẩu:", error);
            throw Object.assign(new Error("Không thể gửi email OTP khôi phục mật khẩu vào lúc này!"), { status: 503 });
        }
    }

    async sendGenericNotificationEmail(toEmail, fullName, title, message) {
        if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASSWORD) {
            console.warn("[MAIL] Thiếu cấu hình SMTP, bỏ qua email notification.");
            return false;
        }

        const mailOptions = {
            from: `"PickleballPro Notification" <${process.env.MAIL_USER}>`,
            to: toEmail,
            subject: `[PickleballPro] ${title}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; background-color: #f3fcef;">
                    <div style="background-color: #ffffff; padding: 24px; border-radius: 16px; border: 1px solid #bccbb9;">
                        <h2 style="color: #006e2f; margin-top: 0;">${title}</h2>
                        <p style="font-size: 15px; color: #161d16;">Xin chào <b>${fullName || "bạn"}</b>,</p>
                        <p style="font-size: 14px; color: #3d4a3d; line-height: 1.6;">${message}</p>
                        <p style="font-size: 12px; color: #667066; margin-top: 24px;">Email này được gửi tự động từ hệ thống PickleballPro.</p>
                    </div>
                </div>
            `,
        };

        const info = await this.transporter.sendMail(mailOptions);
        console.log(`✉️ Notification email đã gửi tới: ${toEmail} - ID: ${info.messageId}`);
        return true;
    }
}

export default new MailUtils();
