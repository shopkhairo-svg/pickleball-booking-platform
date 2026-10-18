import { useState, useEffect } from "react";
import adminService from "../../../services/adminService";

export default function Settings() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Form inputs
    const [websiteInfo, setWebsiteInfo] = useState({
        title: "PickleballPro",
        contactEmail: "",
        contactPhone: "",
        address: ""
    });
    const [otpEmailConfig, setOtpEmailConfig] = useState({
        senderName: "PickleballPro Support",
        expiresInMinutes: 5,
        maxAttempts: 3
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await adminService.getSettings();
            if (res.success && res.settings) {
                setSettings(res.settings);
                if (res.settings.websiteInfo) {
                    setWebsiteInfo(res.settings.websiteInfo);
                }
                if (res.settings.otpEmailConfig) {
                    setOtpEmailConfig(res.settings.otpEmailConfig);
                }
            }
        } catch (err) {
            setErrorMsg("Không thể tải cấu hình hệ thống.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrorMsg("");
        setSuccessMsg("");
        try {
            const res = await adminService.updateSettings({
                websiteInfo,
                otpEmailConfig
            });
            if (res.success) {
                setSuccessMsg("Cấu hình hệ thống đã được lưu thành công!");
                setTimeout(() => setSuccessMsg(""), 3000);
            }
        } catch (err) {
            setErrorMsg(err?.response?.data?.message || "Lỗi lưu cấu hình hệ thống.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-9 w-64 animate-pulse rounded-xl bg-gray-200" />
                <div className="space-y-4">
                    <div className="h-64 animate-pulse rounded-2xl bg-white" />
                    <div className="h-64 animate-pulse rounded-2xl bg-white" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 font-lexend">
            <div>
                <h1 className="admin-page-title">Cấu hình Hệ thống</h1>
                <p className="admin-page-subtitle">Quản lý các thông số chung của website, phí vận chuyển và cấu hình SMTP/OTP.</p>
            </div>

            {successMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700 animate-fadeIn">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    {successMsg}
                </div>
            )}

            {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 animate-fadeIn">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 2. Website Metadata Info */}
                <div className="admin-card p-6 space-y-4">
                    <h3 className="text-base font-black text-gray-800 border-b pb-3 border-gray-100 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">info</span>
                        Thông tin Website & Liên hệ
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600">Tiêu đề Website (Title)</label>
                            <input
                                type="text"
                                value={websiteInfo.title}
                                onChange={(e) => setWebsiteInfo({ ...websiteInfo, title: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-gray-50/50"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600">Email liên hệ hỗ trợ</label>
                            <input
                                type="email"
                                value={websiteInfo.contactEmail}
                                onChange={(e) => setWebsiteInfo({ ...websiteInfo, contactEmail: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-gray-50/50"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600">Hotline liên hệ</label>
                            <input
                                type="text"
                                value={websiteInfo.contactPhone}
                                onChange={(e) => setWebsiteInfo({ ...websiteInfo, contactPhone: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-gray-50/50"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600">Địa chỉ trụ sở</label>
                            <input
                                type="text"
                                value={websiteInfo.address}
                                onChange={(e) => setWebsiteInfo({ ...websiteInfo, address: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-gray-50/50"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* 3. OTP & Security Config */}
                <div className="admin-card p-6 space-y-4">
                    <h3 className="text-base font-black text-gray-800 border-b pb-3 border-gray-100 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">security</span>
                        Cấu hình OTP & Xác thực Email
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600">Tên người gửi Email</label>
                            <input
                                type="text"
                                value={otpEmailConfig.senderName}
                                onChange={(e) => setOtpEmailConfig({ ...otpEmailConfig, senderName: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-gray-50/50"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600">Thời gian hết hạn OTP (phút)</label>
                            <input
                                type="number"
                                value={otpEmailConfig.expiresInMinutes}
                                onChange={(e) => setOtpEmailConfig({ ...otpEmailConfig, expiresInMinutes: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-gray-50/50"
                                min={1}
                                max={60}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600">Giới hạn gửi tối đa (lần / 15 phút)</label>
                            <input
                                type="number"
                                value={otpEmailConfig.maxAttempts}
                                onChange={(e) => setOtpEmailConfig({ ...otpEmailConfig, maxAttempts: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-gray-50/50"
                                min={1}
                                max={10}
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={fetchSettings}
                        className="px-5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        disabled={saving}
                    >
                        Hủy thay đổi
                    </button>
                    <button
                        type="submit"
                        className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center gap-1.5"
                        disabled={saving}
                    >
                        {saving ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[16px]">save</span>
                                <span>Lưu cấu hình</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
