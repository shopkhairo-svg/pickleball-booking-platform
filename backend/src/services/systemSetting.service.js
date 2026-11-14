import SystemSetting from "../models/systemSetting.model.js";

class SystemSettingService {
    validateSetting(key, value) {
        if (!["websiteInfo", "slotDaysAhead"].includes(key)) throw Object.assign(new Error("Cấu hình này đang phát triển và đã bị vô hiệu hóa."), { status: 501 });
        if (key === "slotDaysAhead" && (!Number.isInteger(value) || value < 1 || value > 90)) throw new Error("Số ngày mở lịch phải là số nguyên từ 1 đến 90.");
        if (key === "websiteInfo") {
            const allowed = ["title", "contactEmail", "contactPhone", "address"];
            if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(field => !allowed.includes(field))) throw new Error("Thông tin website không hợp lệ.");
            for (const field of allowed) if (typeof value[field] !== "string" || value[field].length > 500) throw new Error("Thông tin website phải là chuỗi tối đa 500 ký tự.");
        }
    }
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
        this.validateSetting(key, value);
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
