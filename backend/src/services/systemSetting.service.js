import SystemSetting from "../models/systemSetting.model.js";

class SystemSettingService {
    async initializeSettings() {
        try {
            const defaults = [
                {
                    key: "shippingFee",
                    value: 30000,
                    description: "Phí vận chuyển dụng cụ thuê (VNĐ)"
                },
                {
                    key: "otpEmailConfig",
                    value: {
                        senderName: "PickleballPro Support",
                        expiresInMinutes: 5,
                        maxAttempts: 3
                    },
                    description: "Cấu hình gửi email chứa OTP"
                },
                {
                    key: "bookingStatusConfig",
                    value: {
                        statuses: ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]
                    },
                    description: "Cấu hình các trạng thái của đơn hàng/đặt sân"
                },
                {
                    key: "websiteInfo",
                    value: {
                        title: "PickleballPro",
                        contactEmail: "admin@gmail.com",
                        contactPhone: "0900000001",
                        address: "Số 1 Võ Văn Ngân, Linh Chiểu, Thủ Đức, TP.HCM"
                    },
                    description: "Cấu hình thông tin website chính thức"
                },
                {
                    key: "slotDaysAhead",
                    value: 30,
                    description: "Số ngày sinh slot lịch đặt sân trước thời hạn (mặc định: 30 ngày)"
                }
            ];

            for (const item of defaults) {
                const existing = await SystemSetting.findOne({ key: item.key });
                if (!existing) {
                    await SystemSetting.create(item);
                    console.log(`Initialized default setting for key: ${item.key}`);
                }
            }
        } catch (error) {
            console.error("Failed to initialize system settings:", error.message);
        }
    }

    async getSetting(key) {
        const setting = await SystemSetting.findOne({ key });
        return setting ? setting.value : null;
    }

    async updateSetting(key, value) {
        const setting = await SystemSetting.findOneAndUpdate(
            { key },
            { $set: { value } },
            { new: true, upsert: true }
        );
        return setting.value;
    }

    async getAllSettings() {
        const settings = await SystemSetting.find({});
        const result = {};
        settings.forEach(s => {
            result[s.key] = s.value;
        });
        return result;
    }
}

export default new SystemSettingService();
